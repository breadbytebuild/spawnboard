import Link from "next/link";
import { getCurrentHuman } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "@/components/dashboard/invite-form";
import { Users, Shield, Eye } from "lucide-react";

interface AgentWithMembers {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
  members: Array<{
    id: string;
    human_id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
  }>;
  pendingInvites: Array<{
    id: string;
    email: string;
    role: string;
  }>;
}

async function fetchTeamData(humanId: string): Promise<AgentWithMembers[]> {
  const supabase = createAdminClient();

  // Get all agents this human is linked to
  const { data: memberships } = await supabase
    .from("agent_members")
    .select("agent_id, role, agents(id, name, avatar_url)")
    .eq("human_id", humanId);

  if (!memberships || memberships.length === 0) return [];

  const agents: AgentWithMembers[] = [];

  for (const membership of memberships) {
    const agent = membership.agents as unknown as {
      id: string;
      name: string;
      avatar_url: string | null;
    };
    if (!agent) continue;

    let members: AgentWithMembers["members"] = [];
    let pendingInvites: AgentWithMembers["pendingInvites"] = [];

    if (membership.role === "admin") {
      // Admins can see all members and pending invites
      const { data: allMembers } = await supabase
        .from("agent_members")
        .select("id, human_id, role, created_at, humans(name, email)")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: true });

      members = (allMembers ?? []).map((m) => {
        const human = m.humans as unknown as { name: string; email: string };
        return {
          id: m.id,
          human_id: m.human_id,
          name: human?.name ?? "Unknown",
          email: human?.email ?? "",
          role: m.role,
          created_at: m.created_at,
        };
      });

      const { data: invites } = await supabase
        .from("agent_invites")
        .select("id, email, role")
        .eq("agent_id", agent.id);

      // Filter out invites for people who are already members
      const memberEmails = new Set(members.map((m) => m.email.toLowerCase()));
      pendingInvites = (invites ?? []).filter(
        (inv) => !memberEmails.has(inv.email.toLowerCase())
      );
    }

    agents.push({
      id: agent.id,
      name: agent.name,
      avatar_url: agent.avatar_url,
      role: membership.role,
      members,
      pendingInvites,
    });
  }

  return agents;
}

const AGENT_COLORS = [
  "#6366F1", "#EC4899", "#F59E0B", "#22C55E", "#06B6D4",
  "#8B5CF6", "#EF4444", "#14B8A6",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function TeamPage() {
  const human = await getCurrentHuman();

  if (!human) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Team</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage who has access to your agents.
          </p>
        </div>
        <Card>
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">
              Log in to manage your team.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Log in
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const agents = await fetchTeamData(human.id);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Team</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage who has access to your agents.
        </p>
      </div>

      {agents.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-text-secondary">
              You&apos;re not linked to any agents yet.
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              An agent can invite you via the API, or an admin can add you from their team page.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {agents.map((agent, idx) => (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: AGENT_COLORS[idx % AGENT_COLORS.length] }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle>{agent.name}</CardTitle>
                      <Badge variant={agent.role === "admin" ? "default" : "outline"}>
                        {agent.role}
                      </Badge>
                    </div>
                    <CardDescription>
                      {agent.members.length} member{agent.members.length !== 1 ? "s" : ""}
                      {agent.pendingInvites.length > 0 && (
                        <span className="text-warning">
                          {" "}· {agent.pendingInvites.length} pending invite{agent.pendingInvites.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {/* Members table (admin only) */}
              {agent.role === "admin" && agent.members.length > 0 && (
                <div className="mb-6">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-surface-elevated">
                          <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-4 py-2.5">
                            Member
                          </th>
                          <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-4 py-2.5">
                            Role
                          </th>
                          <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-4 py-2.5">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {agent.members.map((member) => (
                          <tr key={member.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-text-primary">
                                  {member.name}
                                  {member.human_id === human.id && (
                                    <span className="text-text-tertiary ml-1.5 text-xs">(you)</span>
                                  )}
                                </p>
                                <p className="text-xs text-text-tertiary font-mono">{member.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                {member.role === "admin" ? (
                                  <Shield className="w-3 h-3 text-accent" />
                                ) : (
                                  <Eye className="w-3 h-3 text-text-tertiary" />
                                )}
                                {member.role}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-text-tertiary tabular-nums">
                              {formatDate(member.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pending invites */}
              {agent.role === "admin" && agent.pendingInvites.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    Pending Invites
                  </p>
                  <div className="space-y-1.5">
                    {agent.pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-2.5"
                      >
                        <span className="text-sm text-text-secondary font-mono">{invite.email}</span>
                        <Badge variant="warning">{invite.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite form (admin only) */}
              {agent.role === "admin" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-text-tertiary" />
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                      Invite Teammate
                    </p>
                  </div>
                  <InviteForm agentId={agent.id} />
                </div>
              )}

              {/* Viewer message */}
              {agent.role === "viewer" && (
                <p className="text-xs text-text-tertiary">
                  You have view-only access to this agent. Contact an admin to change your role.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
