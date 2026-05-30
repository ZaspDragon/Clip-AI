"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import {
  fetchPunches,
  fetchTimesheets,
  saveManualPunchEdit,
} from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Punch, Timesheet } from "@/lib/temptrack-types";
import { formatDate, formatDateTime, formatHours } from "@/lib/temptrack-utils";

export default function TimesheetsPage() {
  const supabase = getBrowserSupabase();
  const { profile } = useAuth();
  const { pushToast } = useToast();

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPunchId, setEditingPunchId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editNote, setEditNote] = useState("");

  useEffect(() => {
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    let active = true;

    async function load() {
      try {
        const [timesheetRows, punchRows] = await Promise.all([
          fetchTimesheets(client, agencyId),
          fetchPunches(client, agencyId),
        ]);

        if (!active) return;
        setTimesheets(timesheetRows);
        setPunches(punchRows);
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Could not load timesheets.", "error");
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

  async function savePunchEdit(punch: Punch) {
    if (!supabase || !editingPunchId) return;
    const client = supabase;
    try {
      const updated = await saveManualPunchEdit(client, punch.id, {
        punched_at: new Date(editTime).toISOString(),
        notes: editNote || `Manual edit by ${profile?.first_name ?? "admin"}`,
      });

      setPunches((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      pushToast("Punch updated successfully.", "success");
      setEditingPunchId(null);
      const refreshedTimesheets = await fetchTimesheets(client, profile?.agency_id ?? undefined);
      setTimesheets(refreshedTimesheets);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not update the punch.", "error");
    }
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin"]}>
      <AppShell
        title="Timesheets"
        description="Timesheets are generated automatically from punches. Agency admins can review hours and correct missed or incorrect punches with a full audit trail."
      >
        <SectionCard title="Weekly timesheets" description="Hours roll up by worker, site, and week so client approval and payroll export stay aligned.">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading timesheets...</p>
          ) : timesheets.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Week</th>
                    <th>Regular</th>
                    <th>Overtime</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((timesheet) => (
                    <tr key={timesheet.id}>
                      <td className="font-semibold">{timesheet.worker_name}</td>
                      <td>
                        {formatDate(timesheet.week_start)} - {formatDate(timesheet.week_end)}
                      </td>
                      <td>{formatHours(timesheet.regular_hours)}</td>
                      <td>{formatHours(timesheet.overtime_hours)}</td>
                      <td>{formatHours(timesheet.total_hours)}</td>
                      <td>{timesheet.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No timesheets yet" message="Once workers start punching, weekly timesheets will appear automatically." />
          )}
        </SectionCard>

        <SectionCard title="Recent punches" description="Edit a punch time when the agency needs to correct a missed or incorrect entry.">
          {punches.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Action</th>
                    <th>Punched at</th>
                    <th>Notes</th>
                    <th>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {punches.map((punch) => (
                    <tr key={punch.id}>
                      <td className="font-semibold">{punch.worker_name}</td>
                      <td>{punch.punch_type}</td>
                      <td>{formatDateTime(punch.punched_at)}</td>
                      <td>{punch.notes || "None"}</td>
                      <td>
                        {editingPunchId === punch.id ? (
                          <div className="grid gap-3">
                            <input
                              type="datetime-local"
                              className="input-base"
                              value={editTime}
                              onChange={(event) => setEditTime(event.target.value)}
                            />
                            <input
                              className="input-base"
                              value={editNote}
                              onChange={(event) => setEditNote(event.target.value)}
                              placeholder="Why was this punch edited?"
                            />
                            <div className="flex gap-2">
                              <button type="button" className="button-primary" onClick={() => void savePunchEdit(punch)}>
                                Save
                              </button>
                              <button type="button" className="button-secondary" onClick={() => setEditingPunchId(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => {
                              setEditingPunchId(punch.id);
                              setEditTime(punch.punched_at.slice(0, 16));
                              setEditNote(punch.notes ?? "");
                            }}
                          >
                            Edit punch
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No punches yet" message="Worker punches will appear here as soon as someone clocks in from a site QR." />
          )}
        </SectionCard>
      </AppShell>
    </AuthGuard>
  );
}
