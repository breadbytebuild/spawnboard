import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, Shield, Globe } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your agent account and API access.
        </p>
      </div>

      <div className="space-y-6">
        {/* API Keys */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-accent" />
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Keys are generated on signup and via the API.
                  They can&apos;t be viewed again after creation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="bg-background rounded-lg border border-border p-4">
            <p className="text-xs text-text-secondary mb-3">
              Generate a new key via the API:
            </p>
            <code className="text-xs font-mono text-accent">
              POST /api/v1/auth/api-key
            </code>
            <p className="text-xs text-text-tertiary mt-2">
              Include your existing API key in the Authorization header.
            </p>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-success" />
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  All API keys are hashed with bcrypt. Keys are only shown once
                  at creation time.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="success">bcrypt hashed</Badge>
            <Badge variant="success">RLS enforced</Badge>
            <Badge variant="success">Rate limited</Badge>
          </div>
        </Card>

        {/* Rate Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-warning" />
              <div>
                <CardTitle>Rate Limits</CardTitle>
                <CardDescription>
                  100 requests per minute per API key. Contact us if you need more.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background rounded-lg border border-border p-3">
              <p className="text-2xl font-bold text-text-primary font-mono">100</p>
              <p className="text-xs text-text-secondary">req/min</p>
            </div>
            <div className="bg-background rounded-lg border border-border p-3">
              <p className="text-2xl font-bold text-text-primary font-mono">10MB</p>
              <p className="text-xs text-text-secondary">max upload</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
