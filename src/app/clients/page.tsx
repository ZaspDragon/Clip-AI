"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import { fetchClients, saveClient } from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Client } from "@/lib/temptrack-types";

export default function ClientsPage() {
  const supabase = getBrowserSupabase();
  const { profile } = useAuth();
  const { pushToast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    notes: "",
  });

  useEffect(() => {
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    let active = true;

    async function load() {
      try {
        const rows = await fetchClients(client, agencyId);
        if (active) {
          setClients(rows);
        }
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Could not load clients.", "error");
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    const userId = profile.id;

    try {
      setSaving(true);
      const savedClient = await saveClient(client, {
        agency_id: agencyId,
        created_by: userId,
        name: form.name,
        contact_name: form.contactName || null,
        contact_email: form.contactEmail || null,
        notes: form.notes || null,
        status: "active",
      });

      setClients((current) => [...current, savedClient].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", contactName: "", contactEmail: "", notes: "" });
      pushToast("Client saved successfully.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save the client.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin"]}>
      <AppShell
        title="Clients"
        description="Create the client companies your agency staffs so sites, workers, approvals, and payroll exports stay organized by account."
      >
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Add client" description="Every worker placement and site belongs to a client company.">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <input className="input-base" placeholder="Client company name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              <input className="input-base" placeholder="Primary contact name" value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} />
              <input type="email" className="input-base" placeholder="Primary contact email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} />
              <textarea className="input-base min-h-[120px]" placeholder="Notes for the agency team" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? "Saving..." : "Save client"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Client list" description="These clients are available to link with job sites, workers, and approvals.">
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Loading clients...</p>
            ) : clients.length ? (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id}>
                        <td className="font-semibold">{client.name}</td>
                        <td>{client.contact_name || "Not set"}</td>
                        <td>{client.contact_email || "Not set"}</td>
                        <td>{client.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No clients yet" message="Create your first client company so you can add sites and assign workers." />
            )}
          </SectionCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
