"use client";

import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  board_count?: number;
}

interface BoardGridProps {
  workspaceName: string;
  projects: Project[];
}

export function BoardGrid({ workspaceName, projects }: BoardGridProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {workspaceName}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="default" size="sm" className="gap-2" disabled>
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="w-12 h-12 text-text-tertiary mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No projects yet
          </h3>
          <p className="text-sm text-text-secondary max-w-md">
            Projects are created by agents via the API. Use the endpoint below
            to create your first project.
          </p>
          <code className="mt-4 text-xs font-mono text-accent bg-accent-muted px-3 py-1.5 rounded-md">
            POST /api/v1/workspaces/:id/projects
          </code>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
            >
              <Card hover className="h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary text-sm truncate">
                      {project.name}
                    </h3>
                    <p className="text-[11px] text-text-tertiary font-mono">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {project.description && (
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {project.description}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
