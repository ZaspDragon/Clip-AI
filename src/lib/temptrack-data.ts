"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Agency,
  Approval,
  Assignment,
  Client,
  ClockAgency,
  ClockClient,
  ClockPunchResult,
  ClockSite,
  ClockStatus,
  ClockWorker,
  PayrollExport,
  Punch,
  Site,
  Subscription,
  SupportTicket,
  Timesheet,
  UserProfile,
  Worker,
} from "@/lib/temptrack-types";
import { last4, toCsv } from "@/lib/temptrack-utils";

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }

  return data as T;
}

export async function fetchAgency(
  supabase: SupabaseClient,
  agencyId: string,
) {
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", agencyId)
    .single();

  return requireData(data as Agency, error);
}

export async function fetchClients(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase.from("clients").select("*").order("name");
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as Client[], error);
}

export async function fetchSites(
  supabase: SupabaseClient,
  agencyId?: string,
  clientId?: string,
) {
  let query = supabase.from("sites").select("*").order("name");
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  if (clientId) {
    query = query.eq("client_id", clientId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as Site[], error);
}

export async function fetchWorkers(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase
    .from("workers")
    .select("*")
    .order("last_name")
    .order("first_name");
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as Worker[], error);
}

export async function fetchAssignments(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase.from("assignments").select("*").order("created_at", {
    ascending: false,
  });
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as Assignment[], error);
}

export async function fetchPunches(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase
    .from("punches")
    .select("*")
    .order("punched_at", { ascending: false })
    .limit(250);
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as Punch[], error);
}

export async function fetchTimesheets(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase
    .from("timesheets")
    .select("*")
    .order("week_start", { ascending: false })
    .order("worker_name");
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as Timesheet[], error);
}

export async function fetchApprovals(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase
    .from("approvals")
    .select("*")
    .order("created_at", { ascending: false });
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as Approval[], error);
}

export async function fetchSubscriptions(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase.from("subscriptions").select("*");
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as Subscription[], error);
}

export async function fetchSupportTickets(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as SupportTicket[], error);
}

export async function fetchUsers(
  supabase: SupabaseClient,
  agencyId?: string,
) {
  let query = supabase
    .from("users")
    .select("*")
    .order("last_name")
    .order("first_name");
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  const { data, error } = await query;
  return requireData((data ?? []) as UserProfile[], error);
}

export async function saveClient(
  supabase: SupabaseClient,
  input: Partial<Client> & Pick<Client, "agency_id" | "name">,
) {
  const payload = {
    agency_id: input.agency_id,
    name: input.name.trim(),
    status: input.status ?? "active",
    contact_name: input.contact_name ?? null,
    contact_email: input.contact_email ?? null,
    notes: input.notes ?? null,
    created_by: input.created_by ?? null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    return requireData(data as Client, error);
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("*")
    .single();
  return requireData(data as Client, error);
}

export async function saveSite(
  supabase: SupabaseClient,
  input: Partial<Site> &
    Pick<Site, "agency_id" | "client_id" | "name">,
) {
  const payload = {
    agency_id: input.agency_id,
    client_id: input.client_id,
    name: input.name.trim(),
    address_line_1: input.address_line_1 ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postal_code: input.postal_code ?? null,
    status: input.status ?? "active",
    created_by: input.created_by ?? null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("sites")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    return requireData(data as Site, error);
  }

  const { data, error } = await supabase
    .from("sites")
    .insert(payload)
    .select("*")
    .single();
  return requireData(data as Site, error);
}

export async function saveWorker(
  supabase: SupabaseClient,
  input: Partial<Worker> &
    Pick<Worker, "agency_id" | "first_name" | "last_name">,
) {
  const payload = {
    agency_id: input.agency_id,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    phone: input.phone ?? null,
    phone_last4: last4(input.phone),
    worker_pin: input.worker_pin ?? null,
    email: input.email ?? null,
    pay_rate: input.pay_rate ?? null,
    status: input.status ?? "active",
    assigned_client_id: input.assigned_client_id ?? null,
    assigned_site_id: input.assigned_site_id ?? null,
    notes: input.notes ?? null,
    created_by: input.created_by ?? null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("workers")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    return requireData(data as Worker, error);
  }

  const { data, error } = await supabase
    .from("workers")
    .insert(payload)
    .select("*")
    .single();
  return requireData(data as Worker, error);
}

export async function saveAssignment(
  supabase: SupabaseClient,
  input: Partial<Assignment> &
    Pick<
      Assignment,
      "agency_id" | "worker_id" | "client_id" | "site_id"
    >,
) {
  const payload = {
    agency_id: input.agency_id,
    worker_id: input.worker_id,
    client_id: input.client_id,
    site_id: input.site_id,
    job_title: input.job_title ?? null,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    status: input.status ?? "active",
    created_by: input.created_by ?? null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("assignments")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    return requireData(data as Assignment, error);
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert(payload)
    .select("*")
    .single();
  return requireData(data as Assignment, error);
}

export async function saveManualPunchEdit(
  supabase: SupabaseClient,
  punchId: string,
  updates: Partial<Punch>,
) {
  const { data, error } = await supabase
    .from("punches")
    .update({
      punch_type: updates.punch_type,
      punched_at: updates.punched_at,
      notes: updates.notes ?? null,
      source: "manual_admin_edit",
      is_manual: true,
    })
    .eq("id", punchId)
    .select("*")
    .single();

  return requireData(data as Punch, error);
}

export async function approveTimesheet(
  supabase: SupabaseClient,
  input: {
    agencyId: string;
    timesheetId: string;
    approverUserId: string;
    approverRole: UserProfile["role"];
    status: "approved" | "rejected";
    notes: string;
  },
) {
  const { data: timesheetData, error: timesheetError } = await supabase
    .from("timesheets")
    .update({
      status: input.status,
      client_notes: input.notes || null,
      client_approved_at: new Date().toISOString(),
      client_approved_by: input.approverUserId,
    })
    .eq("id", input.timesheetId)
    .select("*")
    .single();

  requireData(timesheetData, timesheetError);

  const { error: approvalError } = await supabase.from("approvals").insert({
    agency_id: input.agencyId,
    timesheet_id: input.timesheetId,
    approver_user_id: input.approverUserId,
    approver_role: input.approverRole,
    status: input.status,
    notes: input.notes || null,
  });

  if (approvalError) {
    throw new Error(approvalError.message);
  }
}

export async function createPayrollExport(
  supabase: SupabaseClient,
  input: Omit<PayrollExport, "id" | "created_at" | "updated_at">,
) {
  const { data, error } = await supabase
    .from("payroll_exports")
    .insert(input)
    .select("*")
    .single();

  return requireData(data as PayrollExport, error);
}

export async function createSupportTicket(
  supabase: SupabaseClient,
  input: Omit<SupportTicket, "id" | "created_at" | "updated_at" | "status">,
) {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      ...input,
      status: "open",
    })
    .select("*")
    .single();

  return requireData(data as SupportTicket, error);
}

export async function createClientManager(
  supabase: SupabaseClient,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    agencyId: string;
    assignedClientIds: string[];
    assignedSiteIds: string[];
  },
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("You must be logged in to create a client manager.");
  }

  const response = await fetch("/api/client-managers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const result = (await response.json()) as {
    ok?: boolean;
    password?: string;
    error?: string;
  };

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Could not create the client manager.");
  }

  return result;
}

export async function loadClockAgencies(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("list_clock_agencies");
  return requireData((data ?? []) as ClockAgency[], error);
}

export async function loadClockClients(
  supabase: SupabaseClient,
  agencyId: string,
) {
  const { data, error } = await supabase.rpc("list_clock_clients", {
    p_agency_id: agencyId,
  });
  return requireData((data ?? []) as ClockClient[], error);
}

export async function loadClockSites(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
) {
  const { data, error } = await supabase.rpc("list_clock_sites", {
    p_agency_id: agencyId,
    p_client_id: clientId,
  });
  return requireData((data ?? []) as ClockSite[], error);
}

export async function loadClockWorkers(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
  siteId: string,
) {
  const { data, error } = await supabase.rpc("list_clock_workers", {
    p_agency_id: agencyId,
    p_client_id: clientId,
    p_site_id: siteId,
  });
  return requireData((data ?? []) as ClockWorker[], error);
}

export async function loadClockWorkerStatus(
  supabase: SupabaseClient,
  input: {
    agencyId: string;
    clientId: string;
    siteId: string;
    workerId?: string | null;
    workerName?: string | null;
  },
) {
  const { data, error } = await supabase.rpc("get_clock_worker_status", {
    p_agency_id: input.agencyId,
    p_client_id: input.clientId,
    p_site_id: input.siteId,
    p_worker_id: input.workerId ?? null,
    p_worker_name: input.workerName ?? null,
  });

  return requireData((data ?? null) as ClockStatus, error);
}

export async function submitPublicPunch(
  supabase: SupabaseClient,
  input: {
    agencyId: string;
    clientId: string;
    siteId: string;
    workerId?: string | null;
    workerName: string;
    phoneOrPin: string;
    punchType: string;
    deviceInfo: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase.rpc("submit_public_punch", {
    p_agency_id: input.agencyId,
    p_client_id: input.clientId,
    p_site_id: input.siteId,
    p_worker_id: input.workerId ?? null,
    p_worker_name: input.workerName,
    p_phone_or_pin: input.phoneOrPin,
    p_punch_type: input.punchType,
    p_device_info: input.deviceInfo,
  });

  return requireData((data ?? null) as ClockPunchResult, error);
}

export function buildPayrollCsv(timesheets: Timesheet[]) {
  return toCsv(
    timesheets.map((timesheet) => ({
      worker_name: timesheet.worker_name,
      week_start: timesheet.week_start,
      week_end: timesheet.week_end,
      regular_hours: timesheet.regular_hours,
      overtime_hours: timesheet.overtime_hours,
      total_hours: timesheet.total_hours,
      status: timesheet.status,
    })),
  );
}
