import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Key, Terminal, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Welcome to SpawnBoard</h1>
        <p className="text-text-secondary mt-2">
          Your AI agent&apos;s design workspace. Get started with the API.
        </p>
      </div>

      {/* Quick start */}
      <div className="grid gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary mb-1">
                Quick Start
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Create an agent account and start uploading screens in 30 seconds.
              </p>
              <div className="bg-background rounded-lg border border-border p-4 font-mono text-xs space-y-3">
                <div>
                  <p className="text-text-tertiary mb-1"># 1. Sign up</p>
                  <code className="text-accent">
                    curl -X POST /api/v1/auth/signup \{"\n"}
                    {"  "}-d &apos;{`{"name":"Tommy","email":"tommy@agent.ai","password":"..."}`}&apos;
                  </code>
                </div>
                <div>
                  <p className="text-text-tertiary mb-1"># 2. Create a board</p>
                  <code className="text-accent">
                    curl -X POST /api/v1/projects/:id/boards \{"\n"}
                    {"  "}-H &apos;Authorization: Bearer sb_...&apos; \{"\n"}
                    {"  "}-d &apos;{`{"name":"Onboarding Flow"}`}&apos;
                  </code>
                </div>
                <div>
                  <p className="text-text-tertiary mb-1"># 3. Upload a screen</p>
                  <code className="text-accent">
                    curl -X POST /api/v1/boards/:id/screens \{"\n"}
                    {"  "}-H &apos;Authorization: Bearer sb_...&apos; \{"\n"}
                    {"  "}-F &apos;image=@screen.png&apos; -F &apos;name=Welcome&apos; \{"\n"}
                    {"  "}-F &apos;source_html=&lt;html&gt;...&lt;/html&gt;&apos;
                  </code>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/docs/api-reference">
          <Card hover className="h-full">
            <Key className="w-5 h-5 text-accent mb-3" />
            <h3 className="font-semibold text-sm text-text-primary mb-1">
              API Reference
            </h3>
            <p className="text-xs text-text-secondary">
              Full documentation for all endpoints.
            </p>
            <div className="flex items-center gap-1 mt-3 text-xs text-accent">
              View docs <ArrowRight className="w-3 h-3" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/settings">
          <Card hover className="h-full">
            <Copy className="w-5 h-5 text-accent mb-3" />
            <h3 className="font-semibold text-sm text-text-primary mb-1">
              API Keys
            </h3>
            <p className="text-xs text-text-secondary">
              Manage your agent&apos;s authentication keys.
            </p>
            <div className="flex items-center gap-1 mt-3 text-xs text-accent">
              Manage keys <ArrowRight className="w-3 h-3" />
            </div>
          </Card>
        </Link>

        <Card className="h-full opacity-50">
          <Badge variant="outline" className="mb-3">
            Coming Soon
          </Badge>
          <h3 className="font-semibold text-sm text-text-primary mb-1">
            MCP Integration
          </h3>
          <p className="text-xs text-text-secondary">
            Use SpawnBoard as a native MCP tool.
          </p>
        </Card>
      </div>
    </div>
  );
}
