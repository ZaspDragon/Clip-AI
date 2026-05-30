"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import {
  createSupportTicket,
  fetchSupportTickets,
} from "@/lib/temptrack-data";
import { SUPPORT_CATEGORIES } from "@/lib/temptrack-constants";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { SupportTicket } from "@/lib/temptrack-types";
import { formatDateTime } from "@/lib/temptrack-utils";

export default function SupportPage() {
  const supabase = getBrowserSupabase();
  const { profile } = useAuth();
  const { pushToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    category: string;
    priority: string;
    message: string;
    screenshotUrl: string;
  }>({
    category: SUPPORT_CATEGORIES[0],
    priority: "medium",
    message: "",
    screenshotUrl: "",
  });

  useEffect(() => {
    if (!supabase || !profile) return;
    const client = supabase;
    const agencyId = profile.agency_id ?? undefined;
    let active = true;

    async function load() {
      try {
        const rows = await fetchSupportTickets(client, agencyId);
        if (active) {
          setTickets(rows);
        }
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Could not load support tickets.", "error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [profile, pushToast, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    const userId = profile.id;

    try {
      setSaving(true);
      const ticket = await createSupportTicket(client, {
        agency_id: agencyId,
        submitted_by: userId,
        category: form.category,
        priority: form.priority as SupportTicket["priority"],
        message: form.message,
        screenshot_url: form.screenshotUrl || null,
      });

      setTickets((current) => [ticket, ...current]);
      setForm({
        category: SUPPORT_CATEGORIES[0],
        priority: "medium",
        message: "",
        screenshotUrl: "",
      });
      pushToast("Support ticket created successfully.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not create the support ticket.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin", "client_manager"]}>
      <AppShell
        title="Support tickets"
        description="Track real support issues inside the app, with every ticket saved to Supabase by agency."
      >
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Open a ticket" description="Use support tickets for clock issues, approval problems, payroll questions, and help requests.">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <select className="input-base" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                {SUPPORT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select className="input-base" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <textarea className="input-base min-h-[130px]" placeholder="Describe the issue" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} required />
              <input className="input-base" placeholder="Screenshot URL (optional)" value={form.screenshotUrl} onChange={(event) => setForm((current) => ({ ...current, screenshotUrl: event.target.value }))} />
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? "Sending..." : "Submit support ticket"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Ticket history" description="Agency admins see their own agency tickets. Platform owners see all agencies.">
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Loading tickets...</p>
            ) : tickets.length ? (
              <div className="grid gap-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-[1.5rem] border border-[var(--line)] bg-white/75 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="pill">{ticket.category}</span>
                      <span className="pill">{ticket.priority}</span>
                      <span className="pill">{ticket.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{ticket.message}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                      Created {formatDateTime(ticket.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No support tickets yet" message="When your team needs help, every ticket created here will be stored in Supabase and visible to the right role." />
            )}
          </SectionCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
