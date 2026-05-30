"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SetupCard } from "@/components/temptrack/setup-card";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import { getPostLoginPath } from "@/lib/temptrack-utils";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const supabase = getBrowserSupabase();
  const { supabaseReady, profile, session } = useAuth();
  const { pushToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session && profile) {
      router.replace(nextPath || getPostLoginPath(profile));
    }
  }, [nextPath, profile, router, session]);

  if (!supabaseReady || !supabase) {
    return (
      <SetupCard
        title="Supabase is not configured"
        message="Add your Supabase URL and anon key to enable login for agency admins, client managers, and platform owners."
      />
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const client = supabase;
    try {
      setSubmitting(true);
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      pushToast("Logged in successfully.", "success");
    } catch (error) {
      console.error("Login failed", error);
      pushToast(
        error instanceof Error ? error.message : "Could not log in.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_0.95fr]">
          <section className="glass-card rounded-[2rem] p-8 sm:p-10">
            <p className="section-kicker">Manager login</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Access your agency workspace
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Agency admins, client managers, and platform owners log in here to
              manage workers, approve timesheets, export payroll, and print site
              QR codes.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Worker-friendly clock
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Workers never need to log in. They just scan a site QR and punch.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Real-time records
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Punches, timesheets, approvals, and payroll export all save to Supabase.
                </p>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-8 sm:p-10">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--ink-soft)]">
                  Email
                </label>
                <input
                  type="email"
                  className="input-base"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ops@agency.com"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--ink-soft)]">
                  Password
                </label>
                <input
                  type="password"
                  className="input-base"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button type="submit" className="button-primary mt-2" disabled={submitting}>
                {submitting ? "Logging in..." : "Log in"}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link href="/signup" className="font-semibold text-[var(--accent-deep)]">
                Create a new agency
              </Link>
              <Link href="/" className="font-semibold text-[var(--ink-soft)]">
                Back to worker clock
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-12">
        <div className="glass-card w-full max-w-xl rounded-[2rem] p-8 text-center">
          <p className="section-kicker">Loading</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Opening login
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Checking the next route and preparing your workspace access.
          </p>
        </div>
      </div>
    </div>
  );
}
