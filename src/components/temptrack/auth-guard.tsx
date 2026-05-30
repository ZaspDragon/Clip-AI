"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SetupCard } from "@/components/temptrack/setup-card";
import { useAuth } from "@/components/temptrack/use-auth";
import type { UserRole } from "@/lib/temptrack-types";

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabaseReady, session, profile, loading, profileError } = useAuth();

  useEffect(() => {
    if (!loading && supabaseReady && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, session, supabaseReady]);

  if (!supabaseReady) {
    return (
      <SetupCard
        title="Supabase is not configured"
        message="Add your Supabase project URL, anon key, and service role key to run TempTrack Pro. Once those are set, agency signup, worker punches, approvals, and payroll export will all save to your live database."
      />
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-12">
          <div className="glass-card w-full max-w-xl rounded-[2rem] p-8 text-center">
            <p className="section-kicker">Loading</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Loading your workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              We&apos;re checking your role, agency access, and active records.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    if (profileError) {
      return (
        <SetupCard
          title="We couldn't finish loading your profile"
          message={profileError}
        />
      );
    }

    return null;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="app-shell">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-12">
          <div className="glass-card w-full max-w-xl rounded-[2rem] p-8">
            <p className="section-kicker">Access limited</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              This page is not available for your role
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              TempTrack Pro keeps each user focused on the actions they are
              allowed to take. Try returning to the dashboard or approval queue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
