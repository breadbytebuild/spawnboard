"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  ExternalLink,
  Monitor,
  Code2,
  FileText,
  Palette,
  Copy,
  Check,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Screen } from "./board-canvas";

type Tab = "visual" | "html" | "css" | "context";

interface ScreenInspectorProps {
  screen: Screen;
  onClose: () => void;
}

export function ScreenInspector({ screen, onClose }: ScreenInspectorProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("visual");
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const hasHtml = !!screen.source_html;
  const hasCss = !!screen.source_css;
  const hasContext = !!screen.context_md;
  const hasCode = hasHtml || hasCss || hasContext;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const copyToClipboard = (text: string, tabId: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedTab(tabId);
        setTimeout(() => setCopiedTab(null), 2000);
      },
      () => {} // Clipboard write failed — don't show false confirmation
    );
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof Monitor; available: boolean }> = [
    { id: "visual", label: "Visual", icon: Monitor, available: true },
    { id: "html", label: "HTML", icon: Code2, available: hasHtml },
    { id: "css", label: "CSS", icon: Palette, available: hasCss },
    { id: "context", label: "Context", icon: FileText, available: hasContext },
  ];

  const availableTabs = tabs.filter((t) => t.available);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect screen: ${screen.name}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center focus:outline-none"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-[90vw] max-w-5xl max-h-[90vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-semibold text-text-primary truncate">
              {screen.name}
            </h2>
            <span className="text-[11px] text-text-tertiary font-mono shrink-0">
              {screen.width}x{screen.height}
            </span>

            {/* Always-visible asset type indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              {screen.image_url && (
                <span className="text-[10px] font-mono bg-surface-elevated text-text-secondary px-1.5 py-0.5 rounded border border-border">
                  IMG
                </span>
              )}
              {hasHtml && (
                <span className="text-[10px] font-mono bg-accent-muted text-accent px-1.5 py-0.5 rounded">
                  HTML
                </span>
              )}
              {hasCss && (
                <span className="text-[10px] font-mono bg-accent-muted text-accent px-1.5 py-0.5 rounded">
                  CSS
                </span>
              )}
              {hasContext && (
                <span className="text-[10px] font-mono bg-success/10 text-success px-1.5 py-0.5 rounded">
                  CONTEXT
                </span>
              )}
              {!screen.image_url && !hasHtml && !hasCss && !hasContext && (
                <span className="text-[10px] font-mono bg-surface-elevated text-text-tertiary px-1.5 py-0.5 rounded border border-border">
                  IMAGE ONLY
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {screen.image_url && (
              <Button variant="ghost" size="icon" asChild>
                <a href={screen.image_url} target="_blank" rel="noopener noreferrer" aria-label="Download image">
                  <Download className="w-4 h-4" />
                </a>
              </Button>
            )}
            {screen.html_url && (
              <Button variant="ghost" size="icon" asChild>
                <a href={screen.html_url} target="_blank" rel="noopener noreferrer" aria-label="Open HTML">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        {availableTabs.length > 1 && (
          <div className="flex items-center gap-1 px-5 pt-3 pb-0 shrink-0">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  activeTab === tab.id
                    ? "bg-accent-muted text-accent"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {activeTab === "visual" && (
            <div className="flex items-center justify-center">
              {screen.image_url ? (
                <Image
                  src={screen.image_url}
                  alt={screen.name}
                  width={screen.width}
                  height={screen.height}
                  className="max-h-[72vh] w-auto object-contain rounded-lg border border-border"
                  unoptimized
                />
              ) : screen.html_url ? (
                <iframe
                  src={screen.html_url}
                  title={screen.name}
                  className="border border-border rounded-lg"
                  style={{ width: screen.width, height: Math.min(screen.height, 700) }}
                  sandbox=""
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-text-tertiary">
                  No visual preview available
                </div>
              )}
            </div>
          )}

          {activeTab === "html" && screen.source_html && (
            <CodePanel
              code={screen.source_html}
              language="HTML"
              onCopy={() => copyToClipboard(screen.source_html!, "html")}
              copied={copiedTab === "html"}
            />
          )}

          {activeTab === "css" && screen.source_css && (
            <CodePanel
              code={screen.source_css}
              language="CSS"
              onCopy={() => copyToClipboard(screen.source_css!, "css")}
              copied={copiedTab === "css"}
            />
          )}

          {activeTab === "context" && screen.context_md && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Agent Context
                </h3>
                <button
                  type="button"
                  onClick={() => copyToClipboard(screen.context_md!, "context")}
                  className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                >
                  {copiedTab === "context" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedTab === "context" ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="bg-background rounded-xl border border-border p-6 font-mono text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {screen.context_md}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodePanel({
  code,
  language,
  onCopy,
  copied,
}: {
  code: string;
  language: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Code header */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-elevated border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-error/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
            </div>
            <span className="text-[11px] font-mono text-text-tertiary ml-2">
              {language.toLowerCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Code content */}
        <div className="p-4 bg-background overflow-x-auto max-h-[65vh]">
          <pre className="text-sm font-mono text-text-primary leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
