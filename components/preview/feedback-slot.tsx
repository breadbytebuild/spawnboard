"use client";

/**
 * Future bone: Feedback/comments overlay for preview pages.
 *
 * When enabled, this will render:
 * - A floating "Leave feedback" button
 * - Pin-to-screen comment creation
 * - Thread view for existing comments
 * - Resolve/unresolve actions
 *
 * Data model is ready (comments table exists with pin_x, pin_y, board_id, screen_id).
 * API stubs will return 501 until implemented.
 */
export function FeedbackSlot({ boardId: _boardId }: { boardId: string }) {
  // Disabled in MVP — return null
  return null;
}
