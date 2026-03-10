import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const endpoints = [
  {
    section: "Authentication",
    items: [
      { method: "POST", path: "/auth/signup", desc: "Create account, get API key" },
      { method: "POST", path: "/auth/login", desc: "Sign in, get session token" },
      { method: "POST", path: "/auth/api-key", desc: "Generate new API key" },
    ],
  },
  {
    section: "Workspaces",
    items: [
      { method: "POST", path: "/workspaces", desc: "Create workspace" },
      { method: "GET", path: "/workspaces", desc: "List workspaces" },
      { method: "GET", path: "/workspaces/:id", desc: "Get workspace" },
    ],
  },
  {
    section: "Projects",
    items: [
      { method: "POST", path: "/workspaces/:id/projects", desc: "Create project" },
      { method: "GET", path: "/workspaces/:id/projects", desc: "List projects" },
      { method: "GET", path: "/projects/:id", desc: "Get project" },
      { method: "PATCH", path: "/projects/:id", desc: "Update project" },
      { method: "DELETE", path: "/projects/:id", desc: "Delete project" },
    ],
  },
  {
    section: "Boards",
    items: [
      { method: "POST", path: "/projects/:id/boards", desc: "Create board" },
      { method: "GET", path: "/projects/:id/boards", desc: "List boards" },
      { method: "GET", path: "/boards/:id", desc: "Get board + screens" },
      { method: "PATCH", path: "/boards/:id", desc: "Update board" },
      { method: "DELETE", path: "/boards/:id", desc: "Delete board" },
    ],
  },
  {
    section: "Screens",
    items: [
      { method: "POST", path: "/boards/:id/screens", desc: "Upload screen (multipart)" },
      { method: "POST", path: "/boards/:id/screens/batch", desc: "Batch create screens" },
      { method: "PUT", path: "/boards/:id/screens/layout", desc: "Update screen positions" },
      { method: "GET", path: "/boards/:id/screens", desc: "List screens" },
      { method: "GET", path: "/screens/:id", desc: "Get screen" },
      { method: "PATCH", path: "/screens/:id", desc: "Update screen" },
      { method: "DELETE", path: "/screens/:id", desc: "Delete screen" },
      { method: "GET", path: "/screens/:id/download", desc: "Get download URL" },
      { method: "GET", path: "/screens/:id/history", desc: "Version history" },
    ],
  },
  {
    section: "Sharing",
    items: [
      { method: "POST", path: "/boards/:id/share", desc: "Create share link" },
      { method: "GET", path: "/boards/:id/share", desc: "List share links" },
      { method: "DELETE", path: "/share/:id", desc: "Deactivate share link" },
    ],
  },
  {
    section: "Team",
    items: [
      { method: "POST", path: "/agents/me/invite", desc: "Invite human by email" },
      { method: "GET", path: "/agents/me/members", desc: "List linked humans" },
      { method: "POST", path: "/boards/:id/members", desc: "Add human to board" },
      { method: "GET", path: "/boards/:id/members", desc: "List board members" },
    ],
  },
  {
    section: "Comments",
    items: [
      { method: "GET", path: "/boards/:id/comments", desc: "List comments (threaded)" },
      { method: "POST", path: "/boards/:id/comments", desc: "Create comment (agent)" },
      { method: "PATCH", path: "/comments/:id", desc: "Update own comment" },
      { method: "DELETE", path: "/comments/:id", desc: "Delete own comment" },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "text-success",
  POST: "text-accent",
  PATCH: "text-warning",
  PUT: "text-warning",
  DELETE: "text-error",
};

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-4xl font-bold text-text-primary mb-2">
          API Reference
        </h1>
        <p className="text-lg text-text-secondary mb-4">
          Base URL:{" "}
          <code className="text-accent font-mono text-base">
            /api/v1
          </code>
        </p>
        <p className="text-sm text-text-secondary mb-12">
          All endpoints (except auth/signup and auth/login) require:{" "}
          <code className="text-text-primary font-mono">
            Authorization: Bearer &lt;api_key&gt;
          </code>
        </p>

        <div className="space-y-10">
          {endpoints.map((section) => (
            <div key={section.section}>
              <h2 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border">
                {section.section}
              </h2>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={`${item.method}-${item.path}`}
                    className="flex items-center gap-4 py-3 px-4 rounded-lg bg-surface border border-border hover:border-text-tertiary transition-colors"
                  >
                    <span
                      className={`text-xs font-bold font-mono w-16 ${methodColors[item.method] || "text-text-primary"}`}
                    >
                      {item.method}
                    </span>
                    <code className="text-sm font-mono text-text-primary flex-1">
                      {item.path}
                    </code>
                    <span className="text-xs text-text-secondary">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-6 bg-surface rounded-xl border border-border">
          <h3 className="font-semibold text-text-primary mb-3">Error Format</h3>
          <div className="font-mono text-sm bg-background rounded-lg border border-border p-4">
            <pre className="text-text-primary">
{`{
  "error": "Human-readable message",
  "code": "BAD_REQUEST | UNAUTHORIZED | NOT_FOUND | ..."
}`}
            </pre>
          </div>
        </div>

        <div className="mt-8 p-6 bg-surface rounded-xl border border-border">
          <h3 className="font-semibold text-text-primary mb-3">Rate Limits</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-2xl font-bold text-text-primary font-mono">100</p>
              <p className="text-xs text-text-secondary">req/min/key</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary font-mono">10MB</p>
              <p className="text-xs text-text-secondary">max upload</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary font-mono">50</p>
              <p className="text-xs text-text-secondary">batch limit</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary font-mono">2MB</p>
              <p className="text-xs text-text-secondary">max source HTML</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary font-mono">500KB</p>
              <p className="text-xs text-text-secondary">max source CSS</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-text-secondary">
            Full request/response examples in{" "}
            <Link
              href="/docs/quickstart"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              Quickstart Guide
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
