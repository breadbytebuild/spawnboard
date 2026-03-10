"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { BoardCanvas, type Screen, type Comment } from "./board-canvas";

interface BoardCanvasWrapperProps {
  boardId: string;
  boardName: string;
  screens: Screen[];
  comments: Comment[];
  humanId: string | null;
  humanName: string | null;
  readOnly?: boolean;
}

export function BoardCanvasWrapper({
  boardId,
  boardName,
  screens: initialScreens,
  comments: initialComments,
  humanId,
  humanName,
  readOnly = false,
}: BoardCanvasWrapperProps) {
  const router = useRouter();
  const [screens, setScreens] = useState(initialScreens);
  const [comments, setComments] = useState(initialComments);
  const [currentBoardName, setCurrentBoardName] = useState(boardName);

  const canComment = !!humanId;

  const handleScreenMove = useCallback(
    async (screenId: string, x: number, y: number) => {
      setScreens((prev) =>
        prev.map((s) =>
          s.id === screenId ? { ...s, canvas_x: x, canvas_y: y } : s
        )
      );

      // Persist via API (human-side — uses a server route)
      await fetch(`/api/v1/human/screen-move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screen_id: screenId, canvas_x: x, canvas_y: y }),
      }).catch(() => {});
    },
    []
  );

  const handleBoardRename = useCallback(
    async (name: string) => {
      setCurrentBoardName(name);
      await fetch("/api/v1/human/board-rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: boardId, display_name: name }),
      }).catch(() => {});
      // Refresh server components (sidebar, browse page) with new name
      router.refresh();
    },
    [boardId, router]
  );

  const handleAddComment = useCallback(
    async (comment: {
      pin_type: string;
      screen_id?: string;
      pin_x: number;
      pin_y: number;
      content: string;
    }) => {
      if (!humanId || !humanName) return;

      const res = await fetch("/api/v1/human/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: boardId,
          ...comment,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => [...prev, data.comment]);
        }
      }
    },
    [boardId, humanId, humanName]
  );

  const handleReplyComment = useCallback(
    async (parentId: string, content: string) => {
      if (!humanId) return;

      const parent = comments.find((c) => c.id === parentId);
      if (!parent) return;

      const res = await fetch("/api/v1/human/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: boardId,
          parent_id: parentId,
          pin_type: parent.pin_type,
          screen_id: parent.screen_id || undefined,
          pin_x: parent.pin_x,
          pin_y: parent.pin_y,
          content,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => [...prev, data.comment]);
        }
      }
    },
    [boardId, humanId, comments]
  );

  const handleResolveComment = useCallback(
    async (commentId: string, resolved: boolean) => {
      const res = await fetch(`/api/v1/human/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_resolved: resolved }),
      });

      if (res.ok) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, is_resolved: resolved } : c
          )
        );
      }
    },
    []
  );

  const handleEditComment = useCallback(
    async (commentId: string, content: string) => {
      const res = await fetch(`/api/v1/human/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, content } : c
          )
        );
      }
    },
    []
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const res = await fetch(`/api/v1/human/comments/${commentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setComments((prev) =>
          prev.filter((c) => c.id !== commentId && c.parent_id !== commentId)
        );
      }
    },
    []
  );

  return (
    <BoardCanvas
      screens={screens}
      boardName={currentBoardName}
      readOnly={readOnly}
      comments={comments}
      onScreenMove={readOnly ? undefined : handleScreenMove}
      onBoardRename={readOnly ? undefined : handleBoardRename}
      onAddComment={canComment ? handleAddComment : undefined}
      onReplyComment={canComment ? handleReplyComment : undefined}
      onResolveComment={canComment ? handleResolveComment : undefined}
      onEditComment={canComment ? handleEditComment : undefined}
      onDeleteComment={canComment ? handleDeleteComment : undefined}
    />
  );
}
