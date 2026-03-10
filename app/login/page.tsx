"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Mail, Lock, ArrowRight, Check, Loader2 } from "lucide-react";

type Tab = "magic-link" | "password";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [tab, setTab] = useState<Tab>("magic-link");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            window.location.origin +
            "/auth/callback?redirect=" +
            encodeURIComponent(redirect),
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push(redirect);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-text-primary">SPAWN</span>
              <span className="text-accent">BOARD</span>
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Log in to your SpawnBoard account
          </p>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => { setTab("magic-link"); setError(null); }}
              className={cn(
                "flex-1 px-4 py-3.5 text-sm font-medium transition-colors relative cursor-pointer",
                tab === "magic-link"
                  ? "text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Magic Link
              </div>
              {tab === "magic-link" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
            <button
              onClick={() => { setTab("password"); setError(null); setMagicLinkSent(false); }}
              className={cn(
                "flex-1 px-4 py-3.5 text-sm font-medium transition-colors relative cursor-pointer",
                tab === "password"
                  ? "text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </div>
              {tab === "password" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {tab === "magic-link" && (
              <>
                {magicLinkSent ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-6 h-6 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      Check your email
                    </h3>
                    <p className="text-sm text-text-secondary">
                      We sent a login link to{" "}
                      <span className="text-text-primary font-medium">{email}</span>
                    </p>
                    <button
                      onClick={() => setMagicLinkSent(false)}
                      className="text-sm text-accent hover:text-accent-hover mt-4 cursor-pointer"
                    >
                      Use a different email
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <Input
                      id="magic-email"
                      label="Email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading || !email}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Send magic link
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-text-tertiary text-center">
                      No password needed — we&apos;ll email you a login link
                    </p>
                  </form>
                )}
              </>
            )}

            {tab === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !email || !password}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Log in
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </Card>

        <p className="text-sm text-text-tertiary text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-accent hover:text-accent-hover font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
