"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, RefreshCcw, ShieldCheck, Smartphone } from "lucide-react";

import { SetupCard } from "@/components/temptrack/setup-card";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { PUNCH_ACTIONS } from "@/lib/temptrack-constants";
import {
  fetchAssignments,
  fetchClients,
  fetchSites,
  fetchWorkers,
  loadClockAgencies,
  loadClockClients,
  loadClockSites,
  loadClockWorkerStatus,
  loadClockWorkers,
  submitPublicPunch,
} from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type {
  Assignment,
  Client,
  ClockAgency,
  ClockClient,
  ClockSite,
  ClockStatus,
  ClockWorker,
  Site,
  Worker,
} from "@/lib/temptrack-types";
import {
  fullName,
  getPostLoginPath,
  getWorkerStatusLabel,
  humanizePunchType,
  summarizeLatestPunch,
} from "@/lib/temptrack-utils";

const EMPTY_STATUS: ClockStatus = {
  state: "unknown",
  last_action: null,
  last_punched_at: null,
};

function activeOnly<T extends { status?: string }>(items: T[]) {
  return items.filter((item) => item.status === "active");
}

export function PublicClockScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserSupabase();
  const { supabaseReady, session, profile, agency } = useAuth();
  const { pushToast } = useToast();

  const [agencies, setAgencies] = useState<ClockAgency[]>([]);
  const [clients, setClients] = useState<Array<Client | ClockClient>>([]);
  const [sites, setSites] = useState<Array<Site | ClockSite>>([]);
  const [workers, setWorkers] = useState<Array<Worker | ClockWorker>>([]);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [clientId, setClientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [phoneOrPin, setPhoneOrPin] = useState("");
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<ClockStatus>(EMPTY_STATUS);
  const [latestMessage, setLatestMessage] = useState("Choose your agency, site, and name to punch.");

  const queryAgencyId = searchParams.get("agencyId") ?? "";
  const queryClientId = searchParams.get("clientId") ?? "";
  const querySiteId = searchParams.get("siteId") ?? "";

  const lockedFromQr = Boolean(queryAgencyId && queryClientId && querySiteId);
  const isLoggedInAgencyUser = Boolean(
    session && profile?.agency_id && profile.role !== "client_manager",
  );

  const selectedSiteWorkers = useMemo(() => {
    if (!siteId) return [];

    if (!isLoggedInAgencyUser) {
      return workers;
    }

    const directWorkers = allWorkers.filter(
      (worker) =>
        worker.status === "active" &&
        (worker.assigned_site_id === siteId ||
          worker.assigned_client_id === clientId),
    );

    const assignedWorkerIds = new Set(
      assignments
        .filter((assignment) => assignment.status === "active" && assignment.site_id === siteId)
        .map((assignment) => assignment.worker_id),
    );

    const merged = [
      ...directWorkers,
      ...allWorkers.filter(
        (worker) => worker.status === "active" && assignedWorkerIds.has(worker.id),
      ),
    ];

    const deduped = new Map(merged.map((worker) => [worker.id, worker]));
    return Array.from(deduped.values()).sort((left, right) =>
      fullName(left.first_name, left.last_name).localeCompare(
        fullName(right.first_name, right.last_name),
      ),
    );
  }, [allWorkers, assignments, clientId, isLoggedInAgencyUser, siteId, workers]);

  const displayedWorkers = isLoggedInAgencyUser ? selectedSiteWorkers : workers;

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      return;
    }
    const client = supabase;

    let active = true;

    async function bootstrapClock() {
      try {
        setLoading(true);

        if (isLoggedInAgencyUser && profile?.agency_id && agency) {
          const [clientRows, siteRows, workerRows, assignmentRows] = await Promise.all([
            fetchClients(client, profile.agency_id),
            fetchSites(client, profile.agency_id),
            fetchWorkers(client, profile.agency_id),
            fetchAssignments(client, profile.agency_id),
          ]);

          if (!active) return;

          const activeClients = activeOnly(clientRows);
          const activeSites = activeOnly(siteRows);
          const activeWorkers = activeOnly(workerRows);

          setAgencies([{ id: agency.id, name: agency.name }]);
          setClients(activeClients);
          setSites(activeSites);
          setAllWorkers(activeWorkers);
          setAssignments(assignmentRows);
          const initialClientId = queryClientId || activeClients[0]?.id || "";
          const initialSiteId =
            querySiteId ||
            activeSites.find((site) => site.client_id === initialClientId)?.id ||
            "";
          setAgencyId(queryAgencyId || profile.agency_id);
          setClientId(initialClientId);
          setSiteId(initialSiteId);
          return;
        }

        const agencyRows = await loadClockAgencies(client);
        if (!active) return;
        setAgencies(agencyRows);
        setAgencyId(queryAgencyId || agencyRows[0]?.id || "");
      } catch (error) {
        console.error("Failed to load worker clock", error);
        pushToast(
          error instanceof Error ? error.message : "Could not load the worker clock.",
          "error",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrapClock();

    return () => {
      active = false;
    };
  }, [agency, isLoggedInAgencyUser, profile?.agency_id, pushToast, queryAgencyId, queryClientId, querySiteId, supabase, supabaseReady]);

  useEffect(() => {
    if (!supabase || !agencyId || isLoggedInAgencyUser) return;
    const client = supabase;

    let active = true;

    async function loadClientsForAgency() {
      try {
        const rows = await loadClockClients(client, agencyId);
        if (!active) return;
        setClients(rows);
        setClientId((current) =>
          current && rows.some((client) => client.id === current)
            ? current
            : queryClientId || rows[0]?.id || "",
        );
      } catch (error) {
        console.error("Failed to load clients", error);
        pushToast(
          error instanceof Error ? error.message : "Could not load clients.",
          "error",
        );
      }
    }

    void loadClientsForAgency();

    return () => {
      active = false;
    };
  }, [agencyId, isLoggedInAgencyUser, pushToast, queryClientId, supabase]);

  useEffect(() => {
    if (!agencyId || !clientId) return;

    if (isLoggedInAgencyUser) return;

    if (!supabase) return;
    const client = supabase;

    let active = true;

    async function loadSitesForClient() {
      try {
        const rows = await loadClockSites(client, agencyId, clientId);
        if (!active) return;
        setSites(rows);
        setSiteId((current) =>
          current && rows.some((site) => site.id === current)
            ? current
            : querySiteId || rows[0]?.id || "",
        );
      } catch (error) {
        console.error("Failed to load sites", error);
        pushToast(
          error instanceof Error ? error.message : "Could not load job sites.",
          "error",
        );
      }
    }

    void loadSitesForClient();

    return () => {
      active = false;
    };
  }, [agencyId, clientId, isLoggedInAgencyUser, pushToast, querySiteId, sites, supabase]);

  useEffect(() => {
    if (!agencyId || !clientId || !siteId || isLoggedInAgencyUser) return;

    if (!supabase) return;
    const client = supabase;

    let active = true;

    async function loadWorkersForSite() {
      try {
        const rows = await loadClockWorkers(client, agencyId, clientId, siteId);
        if (!active) return;
        setWorkers(rows);
      } catch (error) {
        console.error("Failed to load workers", error);
        pushToast(
          error instanceof Error ? error.message : "Could not load workers.",
          "error",
        );
      }
    }

    void loadWorkersForSite();

    return () => {
      active = false;
    };
  }, [agencyId, clientId, isLoggedInAgencyUser, pushToast, siteId, supabase]);

  useEffect(() => {
    if (!supabase || !agencyId || !clientId || !siteId) return;
    const client = supabase;

    if (!workerName.trim()) return;

    let active = true;

    async function loadStatus() {
      try {
        const result = await loadClockWorkerStatus(client, {
          agencyId,
          clientId,
          siteId,
          workerId: selectedWorkerId || null,
          workerName,
        });

        if (active) {
          setStatus(result);
        }
      } catch (error) {
        console.error("Failed to load worker status", error);
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, [agencyId, clientId, selectedWorkerId, siteId, supabase, workerName]);

  const selectedAgencyName =
    agencies.find((item) => item.id === agencyId)?.name ?? agency?.name ?? "";
  const selectedClientName =
    clients.find((item) => item.id === clientId)?.name ?? "";
  const selectedSiteName = sites.find((item) => item.id === siteId)?.name ?? "";

  async function handlePunch(action: string) {
    if (!supabase) return;
    const client = supabase;
    if (!agencyId || !clientId || !siteId) {
      pushToast("Choose an agency, client, and job site first.", "error");
      return;
    }
    if (!workerName.trim()) {
      pushToast("Enter or select the worker name first.", "error");
      return;
    }

    try {
      setSubmitting(true);

      const result = await submitPublicPunch(client, {
        agencyId,
        clientId,
        siteId,
        workerId: selectedWorkerId || null,
        workerName: workerName.trim(),
        phoneOrPin: phoneOrPin.trim(),
        punchType: action,
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          screen: `${window.screen.width}x${window.screen.height}`,
        },
      });

      setStatus({
        state: result.current_state,
        last_action: result.punch_type,
        last_punched_at: result.punched_at,
      });

      const message =
        result.message ||
        `${humanizePunchType(action)} saved for ${result.worker_name ?? workerName} at ${result.punched_at}.`;
      setLatestMessage(message);
      pushToast(message, "success");
    } catch (error) {
      console.error("Public punch failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "The punch could not be saved right now.";
      setLatestMessage(message);
      pushToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshClock() {
    if (!supabase) return;
    const client = supabase;
    setLoading(true);
    try {
      if (isLoggedInAgencyUser && profile?.agency_id) {
        const [clientRows, siteRows, workerRows, assignmentRows] = await Promise.all([
          fetchClients(client, profile.agency_id),
          fetchSites(client, profile.agency_id),
          fetchWorkers(client, profile.agency_id),
          fetchAssignments(client, profile.agency_id),
        ]);
        setClients(activeOnly(clientRows));
        setSites(activeOnly(siteRows));
        setAllWorkers(activeOnly(workerRows));
        setAssignments(assignmentRows);
      } else {
        const agencyRows = await loadClockAgencies(client);
        setAgencies(agencyRows);
      }
      pushToast("Worker clock refreshed.", "info");
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Could not refresh the clock.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseReady) {
    return (
      <SetupCard
        title="Supabase is not configured"
        message="Add your Supabase project URL and anon key to start using the worker clock, admin dashboard, approvals, and payroll export."
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[var(--navy)]">
            <Building2 className="h-4 w-4 text-[var(--accent)]" />
            TempTrack Pro
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void refreshClock()} className="button-ghost">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            {session && profile ? (
              <button
                type="button"
                onClick={() => router.push(getPostLoginPath(profile))}
                className="button-secondary"
              >
                <ShieldCheck className="h-4 w-4" />
                Dashboard
              </button>
            ) : (
              <Link href="/login" className="button-secondary">
                <ShieldCheck className="h-4 w-4" />
                Admin login
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-1 items-center">
          <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="glass-card rounded-[2rem] p-6 shadow-[var(--shadow)] sm:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-deep)]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <p className="section-kicker">Worker Clock</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Clock in fast
                  </h1>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                Scan the site QR or choose the agency, client, and job site below.
                Then enter the worker name and last four digits of the phone number
                or PIN to punch in real time.
              </p>

              <div className="mt-8 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    Staffing agency
                  </span>
                  <select
                    value={agencyId}
                    onChange={(event) => {
                      setAgencyId(event.target.value);
                      setClientId("");
                      setSiteId("");
                      setSelectedWorkerId("");
                      setWorkerName("");
                      setPhoneOrPin("");
                      setClients([]);
                      setSites([]);
                      setWorkers([]);
                      setStatus(EMPTY_STATUS);
                    }}
                    disabled={lockedFromQr || loading}
                    className="input-base"
                  >
                    <option value="">Select an agency</option>
                    {agencies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    Company / client
                  </span>
                  <select
                    value={clientId}
                    onChange={(event) => {
                      const nextClientId = event.target.value;
                      setClientId(nextClientId);
                      if (isLoggedInAgencyUser) {
                        const nextSiteId =
                          (sites as Site[]).find(
                            (site) =>
                              site.client_id === nextClientId && site.status === "active",
                          )?.id ?? "";
                        setSiteId(nextSiteId);
                      } else {
                        setSiteId("");
                      }
                      setSelectedWorkerId("");
                      setWorkerName("");
                      setPhoneOrPin("");
                      if (!isLoggedInAgencyUser) {
                        setSites([]);
                      }
                      setWorkers([]);
                      setStatus(EMPTY_STATUS);
                    }}
                    disabled={!agencyId || lockedFromQr || loading}
                    className="input-base"
                  >
                    <option value="">
                      {!agencyId ? "Choose an agency first" : "Select a client"}
                    </option>
                    {clients.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    Job site
                  </span>
                  <select
                    value={siteId}
                    onChange={(event) => {
                      setSiteId(event.target.value);
                      setSelectedWorkerId("");
                      setWorkerName("");
                      setPhoneOrPin("");
                      setWorkers([]);
                      setStatus(EMPTY_STATUS);
                    }}
                    disabled={!clientId || lockedFromQr || loading}
                    className="input-base"
                  >
                    <option value="">
                      {!clientId ? "Choose a client first" : "Select a job site"}
                    </option>
                    {sites
                      .filter((item) => item.client_id === clientId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    Worker name
                  </span>
                  <select
                    value={selectedWorkerId}
                    onChange={(event) => {
                      const nextWorkerId = event.target.value;
                      setSelectedWorkerId(nextWorkerId);
                      setPhoneOrPin("");
                      setStatus(EMPTY_STATUS);
                      const nextWorker = (displayedWorkers as Array<Worker | ClockWorker>).find(
                        (worker) => worker.id === nextWorkerId,
                      );
                      if (!nextWorker) {
                        setWorkerName("");
                        return;
                      }
                      if ("display_name" in nextWorker) {
                        setWorkerName(nextWorker.display_name);
                        return;
                      }
                      setWorkerName(fullName(nextWorker.first_name, nextWorker.last_name));
                    }}
                    disabled={!siteId || submitting}
                    className="input-base"
                  >
                    <option value="">
                      {displayedWorkers.length
                        ? "Choose a worker from the list"
                        : "No assigned workers found. Type the name below instead."}
                    </option>
                    {displayedWorkers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {"display_name" in worker
                          ? worker.display_name
                          : fullName(worker.first_name, worker.last_name)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    Or type the worker name
                  </span>
                  <input
                    value={workerName}
                    onChange={(event) => {
                      setSelectedWorkerId("");
                      setWorkerName(event.target.value);
                      setPhoneOrPin("");
                      setStatus(EMPTY_STATUS);
                    }}
                    placeholder="Brandon Smith"
                    className="input-base"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    Last 4 digits of phone number or worker PIN
                  </span>
                  <input
                    value={phoneOrPin}
                    onChange={(event) => setPhoneOrPin(event.target.value)}
                    placeholder="4821"
                    className="input-base"
                  />
                </label>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PUNCH_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => void handlePunch(action.id)}
                    disabled={submitting || loading}
                    className={action.id === "clock_out" ? "button-secondary min-h-[72px] text-base" : "button-primary min-h-[72px] text-base"}
                  >
                    {submitting ? "Saving..." : action.label}
                  </button>
                ))}
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <div className="glass-card rounded-[2rem] p-6 sm:p-8">
                <p className="section-kicker">Current selection</p>
                <div className="mt-4 space-y-3">
                  <InfoRow label="Agency" value={selectedAgencyName || "Not selected"} />
                  <InfoRow label="Client" value={selectedClientName || "Not selected"} />
                  <InfoRow label="Job site" value={selectedSiteName || "Not selected"} />
                  <InfoRow label="Worker" value={workerName || "Not selected"} />
                </div>
              </div>

              <div className="glass-card rounded-[2rem] p-6 sm:p-8">
                <p className="section-kicker">Last status</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  {getWorkerStatusLabel(status.state)}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {status.last_action
                    ? summarizeLatestPunch({
                        id: "",
                        agency_id: agencyId,
                        client_id: clientId,
                        site_id: siteId,
                        worker_id: selectedWorkerId || null,
                        worker_name: workerName,
                        worker_matched: Boolean(selectedWorkerId),
                        punch_type: status.last_action,
                        punched_at: status.last_punched_at ?? "",
                        local_date: "",
                        source: "qr_clock",
                        device_info: null,
                        notes: null,
                        created_by: null,
                        is_manual: false,
                        created_at: "",
                        updated_at: "",
                      })
                    : "No punches recorded yet for this worker selection."}
                </p>
              </div>

              <div className="glass-card rounded-[2rem] p-6 sm:p-8">
                <p className="section-kicker">Confirmation</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  Ready for the next punch
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {latestMessage}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/75 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
