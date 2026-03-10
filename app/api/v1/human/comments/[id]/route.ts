import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { getCurrentHuman } from "@/lib/auth/helpers";

const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  pin_x: z.number().optional(),
  pin_y: z.number().optional(),
  is_resolved: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const human = await getCurrentHuman();
  if (!human) {
    return apiError("UNAUTHORIZED", "You must be logged in.", {
      fix: "Log in at /login first",
    });
  }

  const { id: commentId } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("comments")
    .select("*")
    .eq("id", commentId)
    .single();

  if (!existing) {
    return apiError("NOT_FOUND", `Comment '${commentId}' not found.`, {
      fix: "Check the comment ID is correct",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body.", {
      fix: "Send a JSON object with Content-Type: application/json",
    });
  }

  const parsed = updateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "comment update");
  }

  // Resolve/unresolve is allowed by any human with board access.
  // Editing content/position is author-only.
  const isResolveOnly =
    parsed.data.is_resolved !== undefined &&
    !parsed.data.content &&
    parsed.data.pin_x === undefined &&
    parsed.data.pin_y === undefined;

  if (!isResolveOnly && existing.human_id !== human.id) {
    return apiError("FORBIDDEN", "You can only edit your own comments. Resolving is open to all team members.", {
      fix: "To resolve, send only { is_resolved: true/false }",
    });
  }

  const updates: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.is_resolved !== undefined) {
    if (parsed.data.is_resolved) {
      updates.resolved_by = human.id;
      updates.resolved_at = new Date().toISOString();
    } else {
      updates.resolved_by = null;
      updates.resolved_at = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError("BAD_REQUEST", "No fields to update.", {
      fix: "Provide at least one of: content, pin_x, pin_y, is_resolved",
    });
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .update(updates)
    .eq("id", commentId)
    .select("*")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to update comment.", {
      fix: "Retry the request",
    });
  }

  return apiSuccess({ comment });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const human = await getCurrentHuman();
  if (!human) {
    return apiError("UNAUTHORIZED", "You must be logged in.", {
      fix: "Log in at /login first",
    });
  }

  const { id: commentId } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("comments")
    .select("id, human_id")
    .eq("id", commentId)
    .single();

  if (!existing) {
    return apiError("NOT_FOUND", `Comment '${commentId}' not found.`, {
      fix: "Check the comment ID is correct",
    });
  }

  if (existing.human_id !== human.id) {
    return apiError("FORBIDDEN", "You can only delete your own comments.", {
      fix: "Use the comment ID for a comment you authored",
    });
  }

  const { error } = await supabase.from("comments").delete().eq("id", commentId);

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to delete comment.", {
      fix: "Retry the request",
    });
  }

  return apiSuccess({ success: true });
}
