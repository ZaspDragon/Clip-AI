"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { SetupCard } from "@/components/temptrack/setup-card";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { supabaseReady, refreshProfile } = useAuth();
  const { pushToast } = useToast();

  const [agencyName, setAgencyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState("starter");
  const [submitting, setSubmitting] = useState(false);

  if (!supabaseReady || !supabase) {
    return (
      <SetupCard
        title="Supabase is not configured"
        message="Add your Supabase URL, anon key, and service role key before creating agencies."
      />
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const client = supabase;

    try {
      setSubmitting(true);

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agencyName,
          firstName,
          lastName,
          phone,
          email,
          password,
          planId,
        }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Could not create the agency.");
      }

      const { error: loginError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        throw loginError;
      }

      await refreshProfile();
      pushToast("Agency created successfully.", "success");
      router.push("/dashboard");
    } catch (error) {
      console.error("Signup failed", error);
      pushToast(
        error instanceof Error ? error.message : "Could not create the agency.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="glass-card rounded-[2rem] p-8 sm:p-10">
            <p className="section-kicker">Agency signup</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Launch your staffing timeclock in one step
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Create the agency admin account, generate the agency record, and start
              adding clients, sites, workers, assignments, and site QR codes right away.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <PlanCard title="Starter" price="$99/mo" hint="Up to 50 workers" active={planId === "starter"} />
              <PlanCard title="Growth" price="$199/mo" hint="Up to 150 workers" active={planId === "growth"} />
              <PlanCard title="Pro" price="$399/mo" hint="Up to 500 workers" active={planId === "pro"} />
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-8 sm:p-10">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <input
                className="input-base"
                value={agencyName}
                onChange={(event) => setAgencyName(event.target.value)}
                placeholder="Agency name"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="input-base"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                  required
                />
                <input
                  className="input-base"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
              <input
                className="input-base"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
              />
              <input
                type="email"
                className="input-base"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Agency admin email"
                required
              />
              <input
                type="password"
                className="input-base"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                required
                minLength={8}
              />
              <select
                className="input-base"
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
              </select>
              <button type="submit" className="button-primary mt-2" disabled={submitting}>
                {submitting ? "Creating agency..." : "Create agency"}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link href="/login" className="font-semibold text-[var(--accent-deep)]">
                Already have an account? Log in
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

function PlanCard({
  title,
  price,
  hint,
  active,
}: {
  title: string;
  price: string;
  hint: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-[1.6rem] border px-4 py-5 ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)]/80"
          : "border-[var(--line)] bg-white/70"
      }`}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{price}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{hint}</p>
    </div>
  );
}
