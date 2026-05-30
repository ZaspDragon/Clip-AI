"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import { fetchClients, fetchSites } from "@/lib/temptrack-data";
import { getEnv } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Client, Site } from "@/lib/temptrack-types";

export default function QrPage() {
  const supabase = getBrowserSupabase();
  const env = getEnv();
  const { profile, agency } = useAuth();
  const { pushToast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);

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
        setSelectedSiteId(siteRows[0]?.id ?? "");
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

  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;
  const selectedClient = clients.find((client) => client.id === selectedSite?.client_id) ?? null;
  const baseUrl =
    env.publicAppUrl ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const qrUrl = selectedSite && profile?.agency_id
    ? `${baseUrl.replace(/\/$/, "")}/clock?agencyId=${profile.agency_id}&clientId=${selectedSite.client_id}&siteId=${selectedSite.id}`
    : "";

  useEffect(() => {
    if (!qrUrl) return;

    let active = true;

    QRCode.toDataURL(qrUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#0d1b3a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error) => {
        console.error("QR generation failed", error);
      });

    return () => {
      active = false;
    };
  }, [qrUrl]);

  async function copyLink() {
    if (!qrUrl) return;
    await navigator.clipboard.writeText(qrUrl);
    pushToast("QR link copied successfully.", "success");
  }

  function downloadQr() {
    if (!qrDataUrl || !selectedSite) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `temptrack-${selectedSite.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
    anchor.click();
  }

  function printPoster() {
    if (!selectedSite || !qrDataUrl) return;
    const popup = window.open("", "_blank", "width=860,height=960");
    if (!popup) return;
    popup.document.write(`
      <html>
        <head>
          <title>TempTrack Pro QR Poster</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #11233f; }
            .card { max-width: 640px; margin: 0 auto; border: 1px solid #d7e3f5; border-radius: 24px; padding: 32px; text-align: center; }
            img { width: 320px; height: 320px; }
            h1 { margin-bottom: 8px; }
            p { line-height: 1.6; }
            .url { margin-top: 16px; word-break: break-word; font-size: 12px; color: #5f7090; }
          </style>
        </head>
        <body>
          <div class="card">
            <p style="letter-spacing:0.18em;text-transform:uppercase;font-size:12px;font-weight:700;color:#144fc9;">TempTrack Pro</p>
            <h1>${selectedClient?.name ?? agency?.name ?? "Client site"}</h1>
            <h2>${selectedSite.name}</h2>
            <p>Scan to clock in, start lunch, end lunch, or clock out.</p>
            <img src="${qrDataUrl}" alt="Site QR Code" />
            <p class="url">${qrUrl}</p>
          </div>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin"]}>
      <AppShell
        title="Site QR codes"
        description="Generate a unique worker clock QR for every job site so workers can punch in without logging in."
      >
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <SectionCard title="Choose a site" description="Each active site gets a unique mobile-friendly worker clock URL.">
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Loading sites...</p>
            ) : sites.length ? (
              <select className="input-base" value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)}>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            ) : (
              <EmptyState title="No sites yet" message="Add a client and job site first so you can generate a QR poster." />
            )}
          </SectionCard>

          <SectionCard title="Printable QR poster" description="Workers scan this code to open the worker clock page on their phone." action={
            <div className="flex flex-wrap gap-3">
              <button type="button" className="button-secondary" onClick={() => void copyLink()} disabled={!qrUrl}>
                Copy link
              </button>
              <button type="button" className="button-secondary" onClick={downloadQr} disabled={!qrDataUrl}>
                Download PNG
              </button>
              <button type="button" className="button-primary" onClick={printPoster} disabled={!qrDataUrl}>
                Print poster
              </button>
            </div>
          }>
            {selectedSite && qrDataUrl ? (
              <div className="grid gap-6 lg:grid-cols-[0.55fr_0.45fr] lg:items-center">
                <div className="rounded-[1.8rem] border border-[var(--line)] bg-white px-6 py-6 text-center">
                  <Image src={qrDataUrl} alt="Site QR code" width={288} height={288} unoptimized className="mx-auto h-72 w-72 rounded-2xl" />
                </div>
                <div className="space-y-4">
                  <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Client
                    </p>
                    <p className="mt-2 text-lg font-semibold">{selectedClient?.name ?? "Unknown client"}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Job site
                    </p>
                    <p className="mt-2 text-lg font-semibold">{selectedSite.name}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Worker clock URL
                    </p>
                    <p className="mt-2 break-all text-sm leading-6 text-[var(--ink-soft)]">{qrUrl}</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="Choose a site to generate the poster" message="Once a site is selected, TempTrack Pro will create a live worker clock QR for that location." />
            )}
          </SectionCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
