"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import type { AgentTree } from "@/app/dashboard/layout";

interface DashboardShellProps {
  agents: AgentTree[];
  human: { id: string; name: string; email: string; avatar_url: string | null };
  children: React.ReactNode;
}

export function DashboardShell({ agents, human, children }: DashboardShellProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-30 h-12 bg-surface border-b border-border flex items-center justify-between px-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">S</span>
            </div>
            <span className="text-xs font-semibold">
              <span className="text-text-primary">SPAWN</span>
              <span className="text-accent">BOARD</span>
            </span>
          </Link>
          <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center">
            <span className="text-[10px] font-bold text-accent">
              {human.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      <Sidebar
        agents={agents}
        human={human}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <main className={`flex-1 overflow-auto ${isMobile ? "pt-12" : ""}`}>
        {children}
      </main>
    </div>
  );
}
