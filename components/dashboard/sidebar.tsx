"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Layers,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const futureItems = [
  { icon: BookOpen, label: "References", disabled: true },
  { icon: Sparkles, label: "Skills", disabled: true },
];

interface SidebarProps {
  workspaces?: Array<{
    id: string;
    name: string;
    projects?: Array<{
      id: string;
      name: string;
      boards?: Array<{ id: string; name: string }>;
    }>;
  }>;
}

export function Sidebar({ workspaces = [] }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen flex flex-col bg-surface border-r border-border">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">
            <span className="text-text-primary">SPAWN</span>
            <span className="text-accent">BOARD</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1 mb-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-accent-muted text-accent font-medium"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Workspaces / Projects tree */}
        {workspaces.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-3 mb-2">
              Projects
            </p>
            {workspaces.map((ws) => (
              <div key={ws.id} className="mb-3">
                <p className="text-xs font-medium text-text-secondary px-3 mb-1 truncate">
                  {ws.name}
                </p>
                {ws.projects?.map((project) => (
                  <div key={project.id}>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ml-2",
                        pathname === `/dashboard/projects/${project.id}`
                          ? "text-accent bg-accent-muted"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                      )}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="truncate">{project.name}</span>
                    </Link>
                    {project.boards?.map((board) => (
                      <Link
                        key={board.id}
                        href={`/dashboard/boards/${board.id}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-md text-xs transition-colors ml-6",
                          pathname === `/dashboard/boards/${board.id}`
                            ? "text-accent"
                            : "text-text-tertiary hover:text-text-secondary"
                        )}
                      >
                        <Layers className="w-3 h-3" />
                        <span className="truncate">{board.name}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Future features (grayed out) */}
        <div>
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-3 mb-2">
            Coming Soon
          </p>
          {futureItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-tertiary/50 cursor-not-allowed"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-text-tertiary font-mono">
          SpawnBoard v0.1.0
        </p>
      </div>
    </aside>
  );
}
