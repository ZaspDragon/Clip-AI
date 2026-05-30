"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import {
  fetchAssignments,
  fetchClients,
  fetchSites,
  fetchWorkers,
  saveAssignment,
} from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Assignment, Client, Site, Worker } from "@/lib/temptrack-types";
import { fullName, formatDate } from "@/lib/temptrack-utils";

export default function AssignmentsPage() {
  const supabase = getBrowserSupabase();
  const { profile } = useAuth();
  const { pushToast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    workerId: "",
    clientId: "",
    siteId: "",
    jobTitle: "",
    startDate: "",
  });

  useEffect(() => {
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    let active = true;

    async function load() {
      try {
        const [clientRows, siteRows, workerRows, assignmentRows] = await Promise.all([
          fetchClients(client, agencyId),
          fetchSites(client, agencyId),
          fetchWorkers(client, agencyId),
          fetchAssignments(client, agencyId),
        ]);

        if (!active) return;
        setClients(clientRows);
        setSites(siteRows);
        setWorkers(workerRows);
        setAssignments(assignmentRows);
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Could not load assignments.", "error");
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

  const workerLookup = useMemo(() => {
    return new Map(workers.map((worker) => [worker.id, fullName(worker.first_name, worker.last_name)]));
  }, [workers]);

  const siteLookup = useMemo(() => {
    return new Map(sites.map((site) => [site.id, site.name]));
  }, [sites]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    const userId = profile.id;

    try {
      setSaving(true);
      const assignment = await saveAssignment(client, {
        agency_id: agencyId,
        created_by: userId,
        worker_id: form.workerId,
        client_id: form.clientId,
        site_id: form.siteId,
        job_title: form.jobTitle || null,
        start_date: form.startDate || null,
        status: "active",
      });

      setAssignments((current) => [assignment, ...current]);
      setForm({
        workerId: "",
        clientId: "",
        siteId: "",
        jobTitle: "",
        startDate: "",
      });
      pushToast("Assignment saved successfully.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save the assignment.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin"]}>
      <AppShell
        title="Assignments"
        description="Assignments control which workers appear on each site QR clock and which punches roll into client approval."
      >
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Assign worker" description="Use active assignments to place a worker on a client job site.">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <select className="input-base" value={form.workerId} onChange={(event) => setForm((current) => ({ ...current, workerId: event.target.value }))} required>
                <option value="">Choose a worker</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {fullName(worker.first_name, worker.last_name)}
                  </option>
                ))}
              </select>
              <select className="input-base" value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value, siteId: "" }))} required>
                <option value="">Choose a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select className="input-base" value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))} required>
                <option value="">Choose a site</option>
                {sites.filter((site) => site.client_id === form.clientId).map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input-base" placeholder="Job title" value={form.jobTitle} onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))} />
                <input type="date" className="input-base" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
              </div>
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? "Saving..." : "Save assignment"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Assignment list" description="Only active assignments show workers on public QR clock pages for that site.">
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Loading assignments...</p>
            ) : assignments.length ? (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Site</th>
                      <th>Job title</th>
                      <th>Start</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="font-semibold">{workerLookup.get(assignment.worker_id) ?? "Unknown worker"}</td>
                        <td>{siteLookup.get(assignment.site_id) ?? "Unknown site"}</td>
                        <td>{assignment.job_title || "Not set"}</td>
                        <td>{assignment.start_date ? formatDate(assignment.start_date) : "Not set"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No assignments yet" message="Assignments make workers appear on specific job site QR clock pages." />
            )}
          </SectionCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
