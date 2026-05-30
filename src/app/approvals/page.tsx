"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import {
  approveTimesheet,
  createClientManager,
  fetchClients,
  fetchSites,
  fetchTimesheets,
} from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Client, Site, Timesheet } from "@/lib/temptrack-types";
import { formatDate, formatHours } from "@/lib/temptrack-utils";

export default function ApprovalsPage() {
  const supabase = getBrowserSupabase();
  const { profile } = useAuth();
  const { pushToast } = useToast();

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [managerForm, setManagerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    clientId: "",
    siteId: "",
  });
  const [creatingManager, setCreatingManager] = useState(false);

  useEffect(() => {
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    let active = true;

    async function load() {
      try {
        const [timesheetRows, clientRows, siteRows] = await Promise.all([
          fetchTimesheets(client, agencyId),
          fetchClients(client, agencyId),
          fetchSites(client, agencyId),
        ]);

        if (!active) return;
        setTimesheets(timesheetRows);
        setClients(clientRows);
        setSites(siteRows);
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Could not load approvals.", "error");
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
  }, [profile?.agency_id, pushToast, supabase]);

  const visibleTimesheets = useMemo(() => {
    return timesheets.filter((timesheet) => timesheet.status !== "approved");
  }, [timesheets]);

  async function handleApproval(timesheet: Timesheet, status: "approved" | "rejected") {
    if (!supabase || !profile?.agency_id || !profile) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    const approverUserId = profile.id;
    const approverRole = profile.role;
    try {
      await approveTimesheet(client, {
        agencyId,
        timesheetId: timesheet.id,
        approverUserId,
        approverRole,
        status,
        notes: notes[timesheet.id] ?? "",
      });

      setTimesheets((current) =>
        current.map((item) =>
          item.id === timesheet.id
            ? {
                ...item,
                status,
                client_notes: notes[timesheet.id] ?? "",
              }
            : item,
        ),
      );
      pushToast(`Timesheet ${status}.`, "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not update the timesheet.", "error");
    }
  }

  async function handleCreateManager(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;

    try {
      setCreatingManager(true);
      const result = await createClientManager(client, {
        firstName: managerForm.firstName,
        lastName: managerForm.lastName,
        email: managerForm.email,
        phone: managerForm.phone,
        agencyId,
        assignedClientIds: managerForm.clientId ? [managerForm.clientId] : [],
        assignedSiteIds: managerForm.siteId ? [managerForm.siteId] : [],
      });

      pushToast(
        `Client manager created. Temporary password: ${result.password}`,
        "success",
      );
      setManagerForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        clientId: "",
        siteId: "",
      });
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not create the client manager.", "error");
    } finally {
      setCreatingManager(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin", "client_manager"]}>
      <AppShell
        title="Client approvals"
        description="Client managers can review weekly hours, approve or reject timesheets, and leave notes. Agency admins can also create the client manager logins they need."
      >
        {profile?.role === "agency_admin" ? (
          <SectionCard title="Create client manager login" description="Use this to issue an approval-only login tied to a specific client or site.">
            <form className="grid gap-4 xl:grid-cols-3" onSubmit={handleCreateManager}>
              <input className="input-base" placeholder="First name" value={managerForm.firstName} onChange={(event) => setManagerForm((current) => ({ ...current, firstName: event.target.value }))} required />
              <input className="input-base" placeholder="Last name" value={managerForm.lastName} onChange={(event) => setManagerForm((current) => ({ ...current, lastName: event.target.value }))} required />
              <input type="email" className="input-base" placeholder="Email" value={managerForm.email} onChange={(event) => setManagerForm((current) => ({ ...current, email: event.target.value }))} required />
              <input className="input-base" placeholder="Phone" value={managerForm.phone} onChange={(event) => setManagerForm((current) => ({ ...current, phone: event.target.value }))} />
              <select className="input-base" value={managerForm.clientId} onChange={(event) => setManagerForm((current) => ({ ...current, clientId: event.target.value, siteId: "" }))}>
                <option value="">Assign client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select className="input-base" value={managerForm.siteId} onChange={(event) => setManagerForm((current) => ({ ...current, siteId: event.target.value }))}>
                <option value="">Assign site</option>
                {sites.filter((site) => !managerForm.clientId || site.client_id === managerForm.clientId).map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              <div className="xl:col-span-3">
                <button type="submit" className="button-primary" disabled={creatingManager}>
                  {creatingManager ? "Creating..." : "Create client manager"}
                </button>
              </div>
            </form>
          </SectionCard>
        ) : null}

        <SectionCard title="Approval queue" description="These timesheets are waiting on client approval or were rejected and need review.">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading timesheets...</p>
          ) : visibleTimesheets.length ? (
            <div className="grid gap-4">
              {visibleTimesheets.map((timesheet) => (
                <div key={timesheet.id} className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{timesheet.worker_name}</h3>
                      <p className="text-sm leading-6 text-[var(--muted)]">
                        {formatDate(timesheet.week_start)} - {formatDate(timesheet.week_end)}
                      </p>
                      <p className="text-sm leading-6 text-[var(--ink-soft)]">
                        Regular: {formatHours(timesheet.regular_hours)} | Overtime: {formatHours(timesheet.overtime_hours)} | Total: {formatHours(timesheet.total_hours)}
                      </p>
                    </div>
                    <span className="pill">{timesheet.status}</span>
                  </div>
                  <textarea
                    className="input-base mt-4 min-h-[90px]"
                    placeholder="Add approval notes or rejection details"
                    value={notes[timesheet.id] ?? timesheet.client_notes ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [timesheet.id]: event.target.value }))
                    }
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="button-primary" onClick={() => void handleApproval(timesheet, "approved")}>
                      Approve timesheet
                    </button>
                    <button type="button" className="button-danger" onClick={() => void handleApproval(timesheet, "rejected")}>
                      Reject timesheet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No timesheets waiting on approval" message="As workers punch in and out, weekly totals will flow into this queue for client review." />
          )}
        </SectionCard>
      </AppShell>
    </AuthGuard>
  );
}
