import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectGrid } from "@/components/dashboard/project-grid";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

  const { data: boards } = await supabase
    .from("boards")
    .select("id, name, description, created_at, sort_order")
    .eq("project_id", id)
    .order("sort_order")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <ProjectGrid
        projectId={project.id}
        projectName={project.name}
        boards={boards || []}
      />
    </div>
  );
}
