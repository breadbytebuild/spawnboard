"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Users,
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Layers,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentTree } from "@/app/dashboard/layout";

interface SidebarProps {
  agents: AgentTree[];
  human?: { id: string; name: string; email: string; avatar_url: string | null } | null;
}

const STORAGE_KEY_COLLAPSED = "sb-sidebar-collapsed";
const STORAGE_KEY_EXPANDED = "sb-sidebar-expanded";

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY_COLLAPSED) === "true";
}

function getInitialExpanded(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_EXPANDED) || "{}");
  } catch {
    return {};
  }
}

const AGENT_COLORS = [
  "#6366F1", "#EC4899", "#F59E0B", "#22C55E", "#06B6D4",
  "#8B5CF6", "#EF4444", "#14B8A6",
];

function agentColor(index: number): string {
  return AGENT_COLORS[index % AGENT_COLORS.length];
}

export function Sidebar({ agents, human }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(getInitialCollapsed());
    setExpanded(getInitialExpanded());
    setMounted(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(next));
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify(next));
      return next;
    });
  };

  const isExpanded = (key: string) => expanded[key] !== false; // default open

  if (!mounted) {
    return <aside className="w-64 h-screen bg-surface border-r border-border" />;
  }

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-surface border-r border-border transition-all duration-200 shrink-0",
        collapsed ? "w-[52px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              <span className="text-text-primary">SPAWN</span>
              <span className="text-accent">BOARD</span>
            </span>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
          </Link>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Top nav items */}
        <div className="space-y-0.5 mb-4">
          <NavLink
            href="/dashboard"
            icon={LayoutDashboard}
            label="Browse"
            active={pathname === "/dashboard"}
            collapsed={collapsed}
          />
          <NavLink
            href="/dashboard/team"
            icon={Users}
            label="Team"
            active={pathname === "/dashboard/team"}
            collapsed={collapsed}
          />
          <NavLink
            href="/dashboard/settings"
            icon={Settings}
            label="Settings"
            active={pathname === "/dashboard/settings"}
            collapsed={collapsed}
          />
        </div>

        {/* Agent tree */}
        {agents.length > 0 && !collapsed && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest px-2 mb-2">
              Agents
            </p>

            {agents.map((agent, agentIdx) => (
              <div key={agent.id} className="mb-1">
                {/* Agent header */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(`agent-${agent.id}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-surface-elevated transition-colors cursor-pointer group"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                    style={{ backgroundColor: agentColor(agentIdx) }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-text-primary font-medium truncate flex-1 text-left text-xs">
                    {agent.name}
                  </span>
                  {isExpanded(`agent-${agent.id}`) ? (
                    <ChevronDown className="w-3 h-3 text-text-tertiary shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-text-tertiary shrink-0" />
                  )}
                </button>

                {/* Projects */}
                {isExpanded(`agent-${agent.id}`) && (
                  <div className="ml-3 mt-0.5">
                    {agent.projects.length === 0 ? (
                      <p className="text-[11px] text-text-tertiary px-2 py-1 italic">
                        No projects yet
                      </p>
                    ) : (
                      agent.projects.map((project) => (
                        <div key={project.id} className="mb-0.5">
                          {/* Project header */}
                          <button
                            type="button"
                            onClick={() => toggleExpanded(`project-${project.id}`)}
                            className={cn(
                              "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
                              pathname === `/dashboard/projects/${project.id}`
                                ? "text-accent bg-accent-muted"
                                : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                            )}
                          >
                            <FolderOpen className="w-3 h-3 shrink-0" />
                            <Link
                              href={`/dashboard/projects/${project.id}`}
                              className="truncate flex-1 text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {project.name}
                            </Link>
                            {isExpanded(`project-${project.id}`) ? (
                              <ChevronDown className="w-2.5 h-2.5 text-text-tertiary shrink-0" />
                            ) : (
                              <ChevronRight className="w-2.5 h-2.5 text-text-tertiary shrink-0" />
                            )}
                          </button>

                          {/* Boards */}
                          {isExpanded(`project-${project.id}`) && (
                            <div className="ml-3 mt-0.5">
                              {project.boards.length === 0 ? (
                                <p className="text-[10px] text-text-tertiary px-2 py-0.5 italic">
                                  No boards
                                </p>
                              ) : (
                                project.boards.map((board) => {
                                  const isActive =
                                    pathname === `/dashboard/boards/${board.id}`;
                                  return (
                                    <Link
                                      key={board.id}
                                      href={`/dashboard/boards/${board.id}`}
                                      className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors",
                                        isActive
                                          ? "text-accent bg-accent-muted font-medium"
                                          : "text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated"
                                      )}
                                    >
                                      <Layers className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate flex-1">
                                        {board.name}
                                      </span>
                                      {board.screen_count > 0 && (
                                        <span className="text-[9px] font-mono text-text-tertiary tabular-nums">
                                          {board.screen_count}
                                        </span>
                                      )}
                                    </Link>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Collapsed: agent avatars */}
        {agents.length > 0 && collapsed && (
          <div className="flex flex-col items-center gap-2 mb-4">
            {agents.map((agent, idx) => (
              <button
                key={agent.id}
                type="button"
                onClick={toggleCollapsed}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer"
                style={{ backgroundColor: agentColor(idx) }}
                title={agent.name}
              >
                {agent.name.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Future features */}
        {!collapsed && (
          <div>
            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest px-2 mb-2">
              Coming Soon
            </p>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-text-tertiary/40 cursor-not-allowed">
                <BookOpen className="w-3.5 h-3.5" />
                References
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-text-tertiary/40 cursor-not-allowed">
                <Sparkles className="w-3.5 h-3.5" />
                Skills
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        {!collapsed && human && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-accent">
                {human.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-text-primary font-medium truncate">
                {human.name}
              </p>
              <p className="text-[9px] text-text-tertiary truncate">
                {human.email}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          {!collapsed && (
            <p className="text-[9px] text-text-tertiary font-mono">v0.1.0</p>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md transition-colors",
        collapsed ? "justify-center p-2" : "px-2 py-1.5 text-xs",
        active
          ? "bg-accent-muted text-accent font-medium"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && label}
    </Link>
  );
}
