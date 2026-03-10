import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { uploadScreenImage, uploadHtmlFile } from "@/lib/storage";
import { autoLayoutPosition } from "@/lib/canvas/layout";

const createScreenSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  canvas_x: z.coerce.number().optional(),
  canvas_y: z.coerce.number().optional(),
  metadata: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: boardId } = await params;
  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("*, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", boardId)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) return apiError("NOT_FOUND", "Board not found");

  const { data: screens, error } = await supabase
    .from("screens")
    .select("*")
    .eq("board_id", boardId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return apiError("INTERNAL_ERROR", "Failed to fetch screens");

  return apiSuccess({ screens });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: boardId } = await params;
  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("*, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", boardId)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) return apiError("NOT_FOUND", "Board not found");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("BAD_REQUEST", "Invalid form data");
  }

  const fields = {
    name: formData.get("name") as string | null,
    width: formData.get("width") as string | null,
    height: formData.get("height") as string | null,
    canvas_x: formData.get("canvas_x") as string | null,
    canvas_y: formData.get("canvas_y") as string | null,
    metadata: formData.get("metadata") as string | null,
  };

  const parsed = createScreenSchema.safeParse(fields);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const { name, width = 393, height = 852, metadata } = parsed.data;
  const imageFile = formData.get("image");
  const htmlContent = formData.get("html") as string | null;

  if (!imageFile && !htmlContent) {
    return apiError("BAD_REQUEST", "Either image or html must be provided");
  }

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_HTML_SIZE = 1 * 1024 * 1024; // 1MB
  const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

  if (imageFile && imageFile instanceof File) {
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return apiError("BAD_REQUEST", "Image must be under 10MB");
    }
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return apiError(
        "BAD_REQUEST",
        "Image must be PNG, JPEG, or WebP"
      );
    }
  }

  if (htmlContent && htmlContent.length > MAX_HTML_SIZE) {
    return apiError("BAD_REQUEST", "HTML content must be under 1MB");
  }

  let parsedMetadata = {};
  if (metadata) {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch {
      return apiError("BAD_REQUEST", "Invalid metadata JSON");
    }
  }

  const screenId = crypto.randomUUID();
  let imageUrl: string | null = null;
  let htmlUrl: string | null = null;

  try {
    if (imageFile && imageFile instanceof File) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      imageUrl = await uploadScreenImage(
        agent.id,
        boardId,
        screenId,
        buffer,
        imageFile.type
      );
    }

    if (htmlContent) {
      htmlUrl = await uploadHtmlFile(agent.id, boardId, screenId, htmlContent);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return apiError("INTERNAL_ERROR", message);
  }

  let sourceType: "image" | "html" | "html_with_screenshot";
  const hasImage = imageFile instanceof File;
  if (hasImage && htmlContent) {
    sourceType = "html_with_screenshot";
  } else if (htmlContent) {
    sourceType = "html";
  } else {
    sourceType = "image";
  }

  let canvasX = parsed.data.canvas_x;
  let canvasY = parsed.data.canvas_y;

  if (canvasX == null || canvasY == null) {
    const { count } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("board_id", boardId);

    const pos = autoLayoutPosition(count ?? 0, width, height);
    canvasX = canvasX ?? pos.canvas_x;
    canvasY = canvasY ?? pos.canvas_y;
  }

  const { data: screen, error } = await supabase
    .from("screens")
    .insert({
      id: screenId,
      board_id: boardId,
      name,
      image_url: imageUrl,
      html_url: htmlUrl,
      source_type: sourceType,
      width,
      height,
      canvas_x: canvasX,
      canvas_y: canvasY,
      metadata: parsedMetadata,
    })
    .select()
    .single();

  if (error) return apiError("INTERNAL_ERROR", "Failed to create screen");

  return apiSuccess({ screen }, 201);
}
