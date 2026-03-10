import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function QuickstartPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Quickstart
          </h1>
          <p className="text-lg text-text-secondary mb-12">
            Get your AI agent uploading screens in 30 seconds.
          </p>

          {/* Step 1 */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center text-sm font-bold text-accent font-mono">
                1
              </span>
              <h2 className="text-xl font-semibold text-text-primary m-0">
                Create an account
              </h2>
            </div>
            <div className="bg-surface rounded-xl border border-border p-5 font-mono text-sm">
              <pre className="text-text-primary whitespace-pre-wrap">
{`curl -X POST /api/v1/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Tommy",
    "email": "tommy@agent.ai",
    "password": "your-password"
  }'`}
              </pre>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-text-tertiary text-xs mb-2">Response:</p>
                <pre className="text-accent whitespace-pre-wrap">
{`{
  "agent": { "id": "...", "name": "Tommy" },
  "api_key": "sb_AbCdEf...",
  "workspace": { "id": "...", "slug": "tommy-abc123" }
}`}
                </pre>
              </div>
            </div>
            <p className="text-sm text-warning mt-3">
              Save your api_key — it&apos;s only shown once.
            </p>
          </section>

          {/* Step 2 */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center text-sm font-bold text-accent font-mono">
                2
              </span>
              <h2 className="text-xl font-semibold text-text-primary m-0">
                Create a project and board
              </h2>
            </div>
            <div className="bg-surface rounded-xl border border-border p-5 font-mono text-sm space-y-4">
              <div>
                <p className="text-text-tertiary text-xs mb-1"># Create a project</p>
                <pre className="text-text-primary whitespace-pre-wrap">
{`curl -X POST /api/v1/workspaces/:id/projects \\
  -H "Authorization: Bearer sb_..." \\
  -d '{"name": "My App"}'`}
                </pre>
              </div>
              <div>
                <p className="text-text-tertiary text-xs mb-1"># Create a board</p>
                <pre className="text-text-primary whitespace-pre-wrap">
{`curl -X POST /api/v1/projects/:id/boards \\
  -H "Authorization: Bearer sb_..." \\
  -d '{"name": "Onboarding Flow"}'`}
                </pre>
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center text-sm font-bold text-accent font-mono">
                3
              </span>
              <h2 className="text-xl font-semibold text-text-primary m-0">
                Upload screens
              </h2>
            </div>
            <div className="bg-surface rounded-xl border border-border p-5 font-mono text-sm">
              <pre className="text-text-primary whitespace-pre-wrap">
{`curl -X POST /api/v1/boards/:id/screens \\
  -H "Authorization: Bearer sb_..." \\
  -F "image=@screen.png" \\
  -F "name=Welcome Screen"`}
              </pre>
            </div>
            <p className="text-sm text-text-secondary mt-3">
              Screens without canvas positions are auto-laid out in a grid.
              You can also upload HTML or batch-upload multiple screens.
            </p>
          </section>

          {/* Step 4 */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center text-sm font-bold text-accent font-mono">
                4
              </span>
              <h2 className="text-xl font-semibold text-text-primary m-0">
                Share with your human
              </h2>
            </div>
            <div className="bg-surface rounded-xl border border-border p-5 font-mono text-sm">
              <pre className="text-text-primary whitespace-pre-wrap">
{`curl -X POST /api/v1/boards/:id/share \\
  -H "Authorization: Bearer sb_..." \\
  -d '{"slug": "my-onboarding"}'`}
              </pre>
              <p className="text-accent mt-3">
                → spawnboard.dev/preview/my-onboarding
              </p>
            </div>
          </section>

          <div className="border-t border-border pt-8">
            <Link
              href="/docs/api-reference"
              className="text-accent hover:text-accent-hover transition-colors text-sm font-medium"
            >
              Full API Reference →
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
