"use client";

import Link from "next/link";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { SectionCard } from "@/components/temptrack/ui";
import { SUBSCRIPTION_PLANS } from "@/lib/temptrack-constants";

export default function BillingPage() {
  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin"]}>
      <AppShell
        title="Billing"
        description="Subscription structure is live in the database now, and this page is ready for a future Stripe or Square integration without breaking the rest of the app."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <SectionCard key={plan.id} title={plan.name} description={plan.description}>
              <p className="text-4xl font-semibold tracking-tight">${plan.price}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Up to {plan.workerLimit} workers
              </p>
            </SectionCard>
          ))}
        </div>

        <SectionCard
          title="Billing status"
          description="Billing is intentionally read-only until a payment provider is connected. That keeps the staffing workflow stable while still showing the subscription structure."
        >
          <div className="rounded-[1.6rem] border border-[var(--line)] bg-white/70 px-5 py-5 text-sm leading-7 text-[var(--muted)]">
            For plan changes or billing help right now, open a support ticket and the
            platform owner can update the subscription record safely.
          </div>
          <div className="mt-4">
            <Link href="/support" className="button-primary">
              Open support ticket
            </Link>
          </div>
        </SectionCard>
      </AppShell>
    </AuthGuard>
  );
}
