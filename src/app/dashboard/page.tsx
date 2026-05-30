"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { MetricCard, SectionCard } from "@/components/temptrack/ui";
import { SETUP_STEPS } from "@/lib/temptrack-constants";
import {
  fetchAssignments,
  fetchClients,
  fetchPunches,
  fetchSites,
  fetchTimesheets,
  fetchWorkers,
} from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import { todayIsoDate } from "@/lib/temptrack-utils";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { profile, agency } = useAuth();

  const [counts, setCounts] = useState({
    clients: 0,
    sites: 0,
    workers: 0,
    assignments: 0,
    punchesToday: 0,
    pendingTimesheets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (profile.role === "client_manager") {
      router.replace("/approvals");
      return;
    }
    if (!supabase) return;
    const client = supabase;
    const agencyId = profile.agency_id ?? undefined;

    let active = true;

    async function loadDashboard() {
      try {
        const [clients, sites, workers, assignments, punches, timesheets] =
          await Promise.all([
            fetchClients(client, agencyId),
            fetchSites(client, agencyId),
            fetchWorkers(client, agencyId),
            fetchAssignments(client, agencyId),
            fetchPunches(client, agencyId),
            fetchTimesheets(client, agencyId),
          ]);

        if (!active) return;

        const today = todayIsoDate();

        setCounts({
          clients: clients.length,
          sites: sites.length,
          workers: workers.length,
          assignments: assignments.length,
          punchesToday: punches.filter((punch) => punch.local_date === today).length,
          pendingTimesheets: timesheets.filter((item) => item.status === "pending").length,
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [profile, router, supabase]);

  const completedSteps = [
    counts.clients > 0,
    counts.sites > 0,
    counts.workers > 0,
    counts.assignments > 0,
    counts.sites > 0,
  ];

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin", "client_manager"]}>
      <AppShell
        title={agency ? `${agency.name} dashboard` : "Agency dashboard"}
        description="Run the full staffing workflow from agency setup through client approvals and payroll export."
        action={
          <Link href="/qr" className="button-primary">
            Generate site QR
          </Link>
        }
      >
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Clients" value={counts.clients} hint="Active client companies in your staffing workspace." />
          <MetricCard label="Job sites" value={counts.sites} hint="Live clock-in locations that can be tied to QR posters." />
          <MetricCard label="Workers" value={counts.workers} hint="Workers currently available for assignment and punching." />
          <MetricCard label="Assignments" value={counts.assignments} hint="Active worker-to-site placements." />
          <MetricCard label="Punches today" value={counts.punchesToday} hint="Live worker activity captured today." />
          <MetricCard label="Pending approvals" value={counts.pendingTimesheets} hint="Weekly timesheets waiting on client review." />
        </section>

        <SectionCard
          eyebrow="Setup checklist"
          title="Get your first site live"
          description="Follow this order so a worker can scan a site QR, punch in, and flow through approval and payroll export cleanly."
        >
          <div className="grid gap-3">
            {SETUP_STEPS.map((step, index) => (
              <div
                key={step}
                className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{step}</p>
                </div>
                <span
                  className={`pill ${
                    completedSteps[index]
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : ""
                  }`}
                >
                  {completedSteps[index] ? "Done" : "Next"}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Quick navigation"
          title="Move through the staffing workflow"
          description="Each page below is wired to the live Supabase workspace for your agency."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/clients" className="button-secondary">
              Manage clients
            </Link>
            <Link href="/sites" className="button-secondary">
              Manage job sites
            </Link>
            <Link href="/workers" className="button-secondary">
              Manage workers
            </Link>
            <Link href="/assignments" className="button-secondary">
              Manage assignments
            </Link>
            <Link href="/timesheets" className="button-secondary">
              Review timesheets
            </Link>
            <Link href="/approvals" className="button-secondary">
              Open approval queue
            </Link>
            <Link href="/payroll" className="button-secondary">
              Export payroll CSV
            </Link>
            <Link href="/help" className="button-secondary">
              Read help center
            </Link>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Loading dashboard metrics...</p>
          ) : null}
        </SectionCard>
      </AppShell>
    </AuthGuard>
  );
}
