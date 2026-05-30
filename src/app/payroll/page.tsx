"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { useAuth } from "@/components/temptrack/use-auth";
import { useToast } from "@/components/temptrack/use-toast";
import { EmptyState, SectionCard } from "@/components/temptrack/ui";
import {
  buildPayrollCsv,
  createPayrollExport,
  fetchTimesheets,
} from "@/lib/temptrack-data";
import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Timesheet } from "@/lib/temptrack-types";
import { formatDate, formatHours } from "@/lib/temptrack-utils";

export default function PayrollPage() {
  const supabase = getBrowserSupabase();
  const { profile } = useAuth();
  const { pushToast } = useToast();

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !profile?.agency_id) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    let active = true;

    async function load() {
      try {
        const rows = await fetchTimesheets(client, agencyId);
        if (active) {
          setTimesheets(rows);
        }
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

  const approvedTimesheets = useMemo(
    () => timesheets.filter((timesheet) => timesheet.status === "approved"),
    [timesheets],
  );

  async function exportCsv() {
    if (!supabase || !profile?.agency_id || !approvedTimesheets.length) return;
    const client = supabase;
    const agencyId = profile.agency_id;
    const userId = profile.id;

    const csv = buildPayrollCsv(approvedTimesheets);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const weekStart = approvedTimesheets[0]?.week_start ?? new Date().toISOString().slice(0, 10);
    const weekEnd = approvedTimesheets[0]?.week_end ?? weekStart;
    const fileName = `temptrack-payroll-${weekStart}.csv`;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    try {
      await createPayrollExport(client, {
        agency_id: agencyId,
        exported_by: userId,
        week_start: weekStart,
        week_end: weekEnd,
        row_count: approvedTimesheets.length,
        file_name: fileName,
        export_format: "csv",
      });
      pushToast("Payroll CSV exported successfully.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "The payroll file downloaded, but the export record could not be saved.", "error");
    }
  }

  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin"]}>
      <AppShell
        title="Payroll export"
        description="Export only approved timesheets to CSV so payroll stays aligned with client signoff."
        action={
          <button type="button" className="button-primary" onClick={() => void exportCsv()} disabled={!approvedTimesheets.length}>
            Export approved CSV
          </button>
        }
      >
        <SectionCard title="Approved timesheets" description="The payroll export uses these approved rows as the source of truth.">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading approved timesheets...</p>
          ) : approvedTimesheets.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Week</th>
                    <th>Regular</th>
                    <th>Overtime</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedTimesheets.map((timesheet) => (
                    <tr key={timesheet.id}>
                      <td className="font-semibold">{timesheet.worker_name}</td>
                      <td>{formatDate(timesheet.week_start)} - {formatDate(timesheet.week_end)}</td>
                      <td>{formatHours(timesheet.regular_hours)}</td>
                      <td>{formatHours(timesheet.overtime_hours)}</td>
                      <td>{formatHours(timesheet.total_hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No approved timesheets yet" message="Client approvals need to be completed before payroll can be exported." />
          )}
        </SectionCard>
      </AppShell>
    </AuthGuard>
  );
}
