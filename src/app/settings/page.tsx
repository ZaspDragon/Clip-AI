"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import { fetchSubscriptions } from "@/lib/temptrack-data";
import { SUBSCRIPTION_PLANS } from "@/lib/temptrack-constants";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Subscription } from "@/lib/temptrack-types";

export default function SettingsPage() {
  const supabase = getBrowserSupabase();
  const { profile, agency } = useAuth();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    let active = true;

    async function load() {
      const rows = await fetchSubscriptions(client, agencyId);
      if (active) {
        setSubscriptions(rows);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [profile?.agency_id, supabase]);

  const subscription = subscriptions[0];
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === subscription?.plan_id);

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin", "client_manager"]}>
      <AppShell
        title="Settings"
        description="Review the current user profile, agency details, and subscription structure without interrupting core staffing workflows."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Your profile">
            <div className="grid gap-3">
              <Detail label="Name" value={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()} />
              <Detail label="Email" value={profile?.email ?? "Not set"} />
              <Detail label="Phone" value={profile?.phone || "Not set"} />
              <Detail label="Role" value={profile?.role ?? "Unknown"} />
            </div>
          </SectionCard>

          <SectionCard title="Agency settings">
            {agency ? (
              <div className="grid gap-3">
                <Detail label="Agency name" value={agency.name} />
                <Detail label="Agency slug" value={agency.slug} />
                <Detail label="Status" value={agency.status} />
                <Link href="/billing" className="button-secondary mt-2">
                  Open billing page
                </Link>
              </div>
            ) : (
              <EmptyState title="No agency found" message="Platform owners may not be tied to a single agency. Agency admins will see their workspace information here." />
            )}
          </SectionCard>

          <SectionCard title="Subscription">
            {subscription ? (
              <div className="grid gap-3">
                <Detail label="Plan" value={plan?.name ?? subscription.plan_id} />
                <Detail label="Status" value={subscription.status} />
                <Detail label="Worker limit" value={`${subscription.worker_limit}`} />
              </div>
            ) : (
              <EmptyState title="No subscription yet" message="A subscription record will appear here once the agency account is provisioned." />
            )}
          </SectionCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
