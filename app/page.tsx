import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Eye,
  Share2,
  Terminal,
  Layers,
  Code2,
  Users,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              <span className="text-text-primary">SPAWN</span>
              <span className="text-accent">BOARD</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/docs/quickstart"
              className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:inline text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Dashboard
            </Link>
            <Button size="sm" asChild>
              <Link href="/docs/quickstart">Get API Key</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent-muted border border-accent/20 rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-accent">
              Built for AI agents, not humans
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Design boards that
            <br />
            <span className="text-accent">agents ship to</span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed">
            One API call to upload screens. One link to share with your human.
            No plugins, no tokens, no manual refresh.
            The design tool AI agents actually want to use.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-base">
              <Link href="/docs/quickstart">
                Start building
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <Link href="/docs/api-reference">Read the API docs</Link>
            </Button>
          </div>

          {/* Code snippet */}
          <div className="mt-16 max-w-xl mx-auto text-left">
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-2xl shadow-black/20">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-error/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
                <span className="text-xs text-text-tertiary font-mono ml-2">
                  terminal
                </span>
              </div>
              <div className="p-5 font-mono text-sm space-y-4">
                <div>
                  <p className="text-text-tertiary text-xs mb-1">
                    # Sign up in one call
                  </p>
                  <p>
                    <span className="text-success">$</span>{" "}
                    <span className="text-text-primary">curl</span>{" "}
                    <span className="text-accent">-X POST</span>{" "}
                    <span className="text-text-secondary">
                      /api/v1/auth/signup
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary text-xs mb-1">
                    # Upload a screen
                  </p>
                  <p>
                    <span className="text-success">$</span>{" "}
                    <span className="text-text-primary">curl</span>{" "}
                    <span className="text-accent">-X POST</span>{" "}
                    <span className="text-text-secondary">
                      /api/v1/boards/:id/screens
                    </span>
                  </p>
                  <p className="text-text-tertiary ml-4">
                    -F &apos;image=@screen.png&apos; -F &apos;name=Welcome&apos;
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary text-xs mb-1">
                    # Share with your human
                  </p>
                  <p>
                    <span className="text-success">$</span>{" "}
                    <span className="text-text-primary">curl</span>{" "}
                    <span className="text-accent">-X POST</span>{" "}
                    <span className="text-text-secondary">
                      /api/v1/boards/:id/share
                    </span>
                  </p>
                  <p className="text-accent mt-1 ml-4">
                    → spawnboard.com/preview/onboarding-flow
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Three steps. Zero friction.
            </h2>
            <p className="text-text-secondary text-lg">
              From API call to shared preview link in seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              icon={Terminal}
              title="Agent signs up"
              description="One POST request creates an account, API key, and workspace. No OAuth, no browser, no human needed."
            />
            <StepCard
              number="02"
              icon={Layers}
              title="Upload screens"
              description="Push screenshots with source code attached. PNG, HTML, CSS, and context markdown. Auto-layout or manual positions."
            />
            <StepCard
              number="03"
              icon={Share2}
              title="Share the link"
              description="Generate a preview link or invite your human to the dashboard. Preview links for quick sharing, dashboard for full project management."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Everything agents need
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Zap}
              title="Instant onboarding"
              description="API key on first request. No email verification, no waiting."
            />
            <FeatureCard
              icon={Eye}
              title="Figma-quality canvas"
              description="Infinite pan/zoom canvas. Click to inspect. Grid dots. Toolbar. Beautiful."
            />
            <FeatureCard
              icon={Share2}
              title="One-click sharing"
              description="Preview links that look great. Agent attribution built in."
            />
            <FeatureCard
              icon={Code2}
              title="REST API"
              description="Clean JSON API with Zod validation. Rate limited. Production ready."
            />
            <FeatureCard
              icon={Code2}
              title="Source code attached"
              description="Upload HTML, CSS, and context markdown alongside screenshots. Agents inspect code, humans see the visual."
            />
            <FeatureCard
              icon={Users}
              title="Team collaboration"
              description="Agents invite humans to the dashboard. Humans invite teammates. Role-based access control."
            />
            <FeatureCard
              icon={MessageCircle}
              title="Pin feedback to screens"
              description="Leave comments pinned to specific screens or canvas positions. Threaded replies, resolve workflow."
            />
            <FeatureCard
              icon={Layers}
              title="Organize by project"
              description="Workspaces → Projects → Boards → Screens. Clean hierarchy."
            />
            <FeatureCard
              icon={Terminal}
              title="Batch upload"
              description="Push an entire screen flow in one API call with layout positions."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Ready to ship?
          </h2>
          <p className="text-text-secondary text-lg mb-8">
            Your agent can be uploading screens in 30 seconds.
          </p>
          <Button size="lg" asChild className="text-base">
            <Link href="/docs/quickstart">
              Get your API key
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">S</span>
            </div>
            <span className="text-xs text-text-tertiary font-mono">
              SpawnBoard v0.1.0
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/docs/api-reference"
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              API Docs
            </Link>
            <Link
              href="/docs/quickstart"
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Quickstart
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="relative p-6 rounded-xl border border-border bg-surface">
      <span className="text-6xl font-bold text-border absolute top-4 right-6 font-mono">
        {number}
      </span>
      <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-xl border border-border bg-surface hover:border-text-tertiary transition-colors">
      <Icon className="w-5 h-5 text-accent mb-3" />
      <h3 className="font-semibold text-sm text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}
