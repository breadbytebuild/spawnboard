"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  CheckCircle2,
  CircleDot,
  Bot,
  User,
  Send,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Comment } from "./board-canvas";

interface CommentPanelProps {
  comment: Comment;
  replies: Comment[];
  onClose: () => void;
  onReply?: (content: string) => void;
  onResolve?: (resolved: boolean) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  readOnly?: boolean;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function AuthorBadge({ type }: { type: "human" | "agent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded",
        type === "agent"
          ? "bg-success/10 text-success"
          : "bg-accent-muted text-accent"
      )}
    >
      {type === "agent" ? (
        <Bot className="w-2.5 h-2.5" />
      ) : (
        <User className="w-2.5 h-2.5" />
      )}
      {type}
    </span>
  );
}

function CommentBubble({
  comment,
  onEdit,
  onDelete,
  readOnly,
}: {
  comment: Comment;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === comment.content) {
      setEditing(false);
      setEditContent(comment.content);
      return;
    }
    onEdit?.(comment.id, trimmed);
    setEditing(false);
  };

  return (
    <div className="group/bubble">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-text-primary">
          {comment.author_name}
        </span>
        <AuthorBadge type={comment.author_type} />
        <span className="text-[10px] text-text-tertiary ml-auto">
          {formatTimestamp(comment.created_at)}
        </span>
      </div>

      {editing ? (
        <div className="mt-1">
          <textarea
            ref={editRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSaveEdit();
              }
              if (e.key === "Escape") {
                setEditing(false);
                setEditContent(comment.content);
              }
            }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            rows={2}
          />
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={handleSaveEdit}
              className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditContent(comment.content);
              }}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>
      )}

      {!readOnly && !editing && (onEdit || onDelete) && (
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
          {onEdit && comment.author_type === "human" && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1 rounded text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {onDelete && comment.author_type === "human" && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="p-1 rounded text-text-tertiary hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CommentPanel({
  comment,
  replies,
  onClose,
  onReply,
  onResolve,
  onEdit,
  onDelete,
  readOnly = false,
}: CommentPanelProps) {
  const [replyContent, setReplyContent] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleReply = () => {
    const trimmed = replyContent.trim();
    if (!trimmed) return;
    onReply?.(trimmed);
    setReplyContent("");
  };

  const sortedReplies = [...replies].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div
      ref={panelRef}
      className="absolute bottom-0 right-0 h-[70vh] w-full sm:top-0 sm:bottom-auto sm:h-full sm:w-80 bg-surface border-t sm:border-t-0 sm:border-l border-border z-40 flex flex-col rounded-t-2xl sm:rounded-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm font-medium text-text-primary">Thread</span>
        </div>
        <div className="flex items-center gap-1">
          {!readOnly && onResolve && (
            <button
              type="button"
              onClick={() => onResolve(!comment.is_resolved)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                comment.is_resolved
                  ? "text-success bg-success/10 hover:bg-success/20"
                  : "text-text-tertiary hover:text-success hover:bg-success/10"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {comment.is_resolved ? "Resolved" : "Resolve"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comment thread */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border/50">
          <CommentBubble
            comment={comment}
            onEdit={onEdit}
            onDelete={onDelete}
            readOnly={readOnly}
          />
          {comment.pin_type === "screen" && comment.screen_id && (
            <div className="mt-2">
              <span className="text-[10px] font-mono text-text-tertiary bg-surface-elevated px-1.5 py-0.5 rounded">
                on screen
              </span>
            </div>
          )}
        </div>

        {sortedReplies.length > 0 && (
          <div className="px-4 py-1">
            {sortedReplies.map((reply) => (
              <div
                key={reply.id}
                className="py-3 border-b border-border/30 last:border-0"
              >
                <CommentBubble
                  comment={reply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply input */}
      {!readOnly && onReply && (
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
              placeholder="Reply..."
              rows={1}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              onClick={handleReply}
              disabled={!replyContent.trim()}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                "text-text-tertiary hover:text-accent hover:bg-accent-muted",
                "disabled:opacity-30 disabled:pointer-events-none"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
