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
  saveWorker,
} from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Assignment, Client, Site, Worker } from "@/lib/temptrack-types";
import { formatCurrency, fullName } from "@/lib/temptrack-utils";

export default function WorkersPage() {
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
    firstName: "",
    lastName: "",
    phone: "",
    workerPin: "",
    email: "",
    payRate: "",
    clientId: "",
    siteId: "",
    notes: "",
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
        pushToast(error instanceof Error ? error.message : "Could not load workers.", "error");
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
      const worker = await saveWorker(client, {
        agency_id: agencyId,
        created_by: userId,
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone || null,
        worker_pin: form.workerPin || null,
        email: form.email || null,
        pay_rate: form.payRate ? Number(form.payRate) : null,
        status: "active",
        assigned_client_id: form.clientId || null,
        assigned_site_id: form.siteId || null,
        notes: form.notes || null,
      });

      setWorkers((current) =>
        [...current, worker].sort((a, b) =>
          fullName(a.first_name, a.last_name).localeCompare(
            fullName(b.first_name, b.last_name),
          ),
        ),
      );

      if (form.clientId && form.siteId) {
        const alreadyAssigned = assignments.some(
          (assignment) =>
            assignment.worker_id === worker.id &&
            assignment.site_id === form.siteId &&
            assignment.status === "active",
        );

        if (!alreadyAssigned) {
          const assignment = await saveAssignment(client, {
            agency_id: agencyId,
            created_by: userId,
            worker_id: worker.id,
            client_id: form.clientId,
            site_id: form.siteId,
            status: "active",
          });

          setAssignments((current) => [assignment, ...current]);
        }
      }

      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        workerPin: "",
        email: "",
        payRate: "",
        clientId: "",
        siteId: "",
        notes: "",
      });
      pushToast("Worker saved successfully.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save the worker.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin"]}>
      <AppShell
        title="Workers"
        description="Workers do not need login accounts. Add them as agency records, assign them to sites, and they can immediately punch from a QR code."
      >
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Add worker" description="Worker email is optional. QR punching uses worker name plus phone last 4 digits or PIN.">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input-base" placeholder="First name" value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} required />
                <input className="input-base" placeholder="Last name" value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input-base" placeholder="Phone number" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                <input className="input-base" placeholder="Worker PIN (optional)" value={form.workerPin} onChange={(event) => setForm((current) => ({ ...current, workerPin: event.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="email" className="input-base" placeholder="Email (optional)" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                <input type="number" step="0.01" className="input-base" placeholder="Pay rate" value={form.payRate} onChange={(event) => setForm((current) => ({ ...current, payRate: event.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <select className="input-base" value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value, siteId: "" }))}>
                  <option value="">Assigned client (optional)</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <select className="input-base" value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))}>
                  <option value="">Assigned site (optional)</option>
                  {sites
                    .filter((site) => !form.clientId || site.client_id === form.clientId)
                    .map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                </select>
              </div>
              <textarea className="input-base min-h-[110px]" placeholder="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? "Saving..." : "Save worker"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Worker list" description="Workers assigned to sites show up automatically on the worker QR clock page.">
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Loading workers...</p>
            ) : workers.length ? (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Pay rate</th>
                      <th>Assigned site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((worker) => (
                      <tr key={worker.id}>
                        <td className="font-semibold">{fullName(worker.first_name, worker.last_name)}</td>
                        <td>{worker.phone || "Not set"}</td>
                        <td>{formatCurrency(worker.pay_rate)}</td>
                        <td>{worker.assigned_site_id ? siteLookup.get(worker.assigned_site_id) ?? "Assigned" : "Not assigned"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No workers yet" message="Add the workers who should appear on the public QR punch page." />
            )}
          </SectionCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
