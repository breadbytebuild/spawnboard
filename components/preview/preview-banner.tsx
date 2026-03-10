"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface PreviewBannerProps {
  agentId: string;
  agentName: string;
  isLoggedIn: boolean;
  isLinked: boolean;
}

export function PreviewBanner({
  agentId,
  agentName,
  isLoggedIn,
  isLinked,
}: PreviewBannerProps) {
  if (isLinked) {
    return (
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center gap-3 bg-surface/90 backdrop-blur-xl border-b border-border px-4 py-2">
        <div className="w-5 h-5 rounded bg-accent flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-white">S</span>
        </div>
        <span className="text-xs text-text-secondary">
          <span className="text-text-primary font-medium">{agentName}</span>&apos;s workspace
        </span>
        <Link
          href="/dashboard"
          className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
        >
          Open in Dashboard <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center gap-3 bg-surface/90 backdrop-blur-xl border-b border-border px-4 py-2">
        <div className="w-5 h-5 rounded bg-accent flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-white">S</span>
        </div>
        <span className="text-xs text-text-secondary">
          Ask <span className="text-text-primary font-medium">{agentName}</span> to add you for full dashboard access
        </span>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center gap-3 bg-surface/90 backdrop-blur-xl border-b border-border px-4 py-2">
      <div className="w-5 h-5 rounded bg-accent flex items-center justify-center shrink-0">
        <span className="text-[9px] font-bold text-white">S</span>
      </div>
      <span className="text-xs text-text-secondary hidden sm:inline">
        Want full access to <span className="text-text-primary font-medium truncate max-w-[120px] inline-block align-bottom">{agentName}</span>&apos;s boards?
      </span>
      <span className="text-xs text-text-secondary sm:hidden">
        Get full access
      </span>
      <Link
        href={`/signup?from=preview&agent=${agentId}`}
        className="text-xs bg-accent text-white px-3 py-1 rounded-md hover:bg-accent-hover font-medium transition-colors shrink-0"
      >
        Sign up free
      </Link>
    </div>
  );
}
