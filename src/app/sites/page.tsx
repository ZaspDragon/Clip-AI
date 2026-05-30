"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import { fetchClients, fetchSites, saveSite } from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Client, Site } from "@/lib/temptrack-types";

export default function SitesPage() {
  const supabase = getBrowserSupabase();
  const { profile } = useAuth();
  const { pushToast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });

  useEffect(() => {
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    let active = true;

    async function load() {
      try {
        const [clientRows, siteRows] = await Promise.all([
          fetchClients(client, agencyId),
          fetchSites(client, agencyId),
        ]);
        if (!active) return;
        setClients(clientRows);
        setSites(siteRows);
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Could not load sites.", "error");
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

  const clientLookup = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client.name]));
  }, [clients]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    const userId = profile.id;

    try {
      setSaving(true);
      const site = await saveSite(client, {
        agency_id: agencyId,
        client_id: form.clientId,
        created_by: userId,
        name: form.name,
        address_line_1: form.address || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postalCode || null,
        status: "active",
      });

      setSites((current) => [...current, site].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({
        clientId: "",
        name: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
      });
      pushToast("Job site saved successfully.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save the job site.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin"]}>
      <AppShell
        title="Job sites"
        description="Create every warehouse, branch, or field location where workers will scan a QR code to punch in."
      >
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Add job site" description="Each site rolls up under a client company and becomes a unique QR clock location.">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <select className="input-base" value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))} required>
                <option value="">Choose a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <input className="input-base" placeholder="Site name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              <input className="input-base" placeholder="Address line 1" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              <div className="grid gap-4 sm:grid-cols-3">
                <input className="input-base" placeholder="City" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
                <input className="input-base" placeholder="State" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} />
                <input className="input-base" placeholder="Postal code" value={form.postalCode} onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))} />
              </div>
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? "Saving..." : "Save job site"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Site list" description="Sites are what power QR posters, public worker clock-ins, and client approvals.">
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Loading job sites...</p>
            ) : sites.length ? (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Client</th>
                      <th>Address</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site) => (
                      <tr key={site.id}>
                        <td className="font-semibold">{site.name}</td>
                        <td>{clientLookup.get(site.client_id) ?? "Unknown client"}</td>
                        <td>{site.address_line_1 || "Not set"}</td>
                        <td>{site.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No job sites yet" message="Create a site under a client so workers have somewhere to scan in and client managers have a location to approve." />
            )}
          </SectionCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
