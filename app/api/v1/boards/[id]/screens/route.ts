import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
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
  source_html: z.string().max(2_000_000).optional(),
  source_css: z.string().max(500_000).optional(),
  context_md: z.string().max(100_000).optional(),
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

  if (!board) return apiError("NOT_FOUND", `Board '${boardId}' not found. Verify the board ID is correct and belongs to your project.`, { fix: "Call GET /projects/:id/boards to list your boards" });

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

  if (!board) return apiError("NOT_FOUND", `Board '${boardId}' not found. Verify the board ID is correct and belongs to your project.`, { fix: "Call GET /projects/:id/boards to list your boards" });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("BAD_REQUEST", "Invalid request body. Screen upload requires multipart/form-data with at least: name (text field) and image (file) or html (text field).", { fix: "Use Content-Type: multipart/form-data. Send -F 'image=@file.png' -F 'name=Screen Name'" });
  }

  const getString = (key: string) => {
    const val = formData.get(key);
    return typeof val === "string" ? val : undefined;
  };

  const fields = {
    name: getString("name"),
    width: getString("width"),
    height: getString("height"),
    canvas_x: getString("canvas_x"),
    canvas_y: getString("canvas_y"),
    metadata: getString("metadata"),
    source_html: getString("source_html"),
    source_css: getString("source_css"),
    context_md: getString("context_md"),
  };

  const parsed = createScreenSchema.safeParse(fields);
  if (!parsed.success) {
    return zodApiError(parsed.error, "screen upload");
  }

  const { name, width = 393, height = 852, metadata, source_html, source_css, context_md } = parsed.data;
  const imageFile = formData.get("image");
  const htmlContent = formData.get("html") as string | null;

  if (!imageFile && !htmlContent) {
    return apiError("BAD_REQUEST", "Missing screen content. You must provide either an 'image' file (PNG/JPEG/WebP, max 10MB) or an 'html' text field (max 1MB), or both.", { fix: "Add -F 'image=@yourfile.png' or -F 'html=<html>...</html>' to your request" });
  }

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_HTML_SIZE = 1 * 1024 * 1024; // 1MB
  const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

  if (imageFile && imageFile instanceof File) {
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return apiError("BAD_REQUEST", "Image file too large (max 10MB). Resize or compress the image and retry.", { fix: "Reduce image file size to under 10MB" });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return apiError("BAD_REQUEST", `Unsupported image format. Accepted formats: image/png, image/jpeg, image/webp. Got: ${imageFile.type}`, { fix: "Convert your image to PNG, JPEG, or WebP format" });
    }
  }

  if (htmlContent && htmlContent.length > MAX_HTML_SIZE) {
    return apiError("BAD_REQUEST", "HTML content too large (max 1MB). Reduce the HTML size and retry.", { fix: "Simplify the HTML or remove inline assets" });
  }

  let parsedMetadata = {};
  if (metadata) {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch {
      return apiError("BAD_REQUEST", "The 'metadata' field must be a valid JSON string. Example: '{\"device\":\"iphone\"}'", { fix: "Ensure metadata is a properly escaped JSON string" });
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
      source_html: source_html || null,
      source_css: source_css || null,
      context_md: context_md || null,
    })
    .select()
    .single();

  if (error) return apiError("INTERNAL_ERROR", "Failed to save screen to database. Server error — retry the request.", { fix: "Retry the request" });

  return apiSuccess({ screen }, 201);
}
