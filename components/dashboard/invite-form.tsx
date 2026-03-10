"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface InviteFormProps {
  agentId: string;
}

export function InviteForm({ agentId }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("admin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/human/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to send invite" });
        return;
      }

      setMessage({ type: "success", text: `Invited ${data.invite.email} as ${data.invite.role}` });
      setEmail("");
    } catch {
      setMessage({ type: "error", text: "Network error — try again" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <Input
          id={`invite-email-${agentId}`}
          label="Email address"
          type="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`invite-role-${agentId}`} className="text-sm font-medium text-text-secondary">
          Role
        </label>
        <select
          id={`invite-role-${agentId}`}
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "viewer")}
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background transition-colors"
        >
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      <Button type="submit" disabled={loading || !email.trim()} size="default">
        <Send className="w-4 h-4" />
        {loading ? "Sending..." : "Invite"}
      </Button>

      {message && (
        <p className={`text-xs self-center ${message.type === "success" ? "text-success" : "text-error"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
