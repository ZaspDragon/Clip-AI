export type UserRole =
  | "platform_owner"
  | "agency_admin"
  | "client_manager"
  | "worker";

export type SubscriptionPlan = "starter" | "growth" | "pro";

export type PunchType =
  | "clock_in"
  | "start_lunch"
  | "end_lunch"
  | "clock_out";

export type TimesheetStatus = "pending" | "approved" | "rejected";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type BaseRecord = {
  id: string;
  created_at: string;
  updated_at: string;
};

export type Agency = BaseRecord & {
  name: string;
  slug: string;
  status: "active" | "inactive";
  created_by: string | null;
};

export type UserProfile = BaseRecord & {
  id: string;
  agency_id: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive";
  assigned_client_ids: string[];
  assigned_site_ids: string[];
};

export type Client = BaseRecord & {
  agency_id: string;
  name: string;
  status: "active" | "inactive";
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  created_by: string | null;
};

export type Site = BaseRecord & {
  agency_id: string;
  client_id: string;
  name: string;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  status: "active" | "inactive";
  created_by: string | null;
};

export type Worker = BaseRecord & {
  agency_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  phone_last4: string | null;
  worker_pin: string | null;
  email: string | null;
  pay_rate: number | null;
  status: "active" | "inactive";
  assigned_client_id: string | null;
  assigned_site_id: string | null;
  notes: string | null;
  created_by: string | null;
};

export type Assignment = BaseRecord & {
  agency_id: string;
  worker_id: string;
  client_id: string;
  site_id: string;
  job_title: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "inactive";
  created_by: string | null;
};

export type Punch = BaseRecord & {
  agency_id: string;
  client_id: string;
  site_id: string;
  worker_id: string | null;
  worker_name: string;
  worker_matched: boolean;
  punch_type: PunchType;
  punched_at: string;
  local_date: string;
  source: "qr_clock" | "manual_admin_edit";
  device_info: Record<string, unknown> | null;
  notes: string | null;
  created_by: string | null;
  is_manual: boolean;
};

export type Timesheet = BaseRecord & {
  agency_id: string;
  client_id: string;
  site_id: string;
  worker_id: string;
  worker_name: string;
  week_start: string;
  week_end: string;
  regular_hours: number;
  overtime_hours: number;
  total_hours: number;
  status: TimesheetStatus;
  client_notes: string | null;
  agency_notes: string | null;
  client_approved_at: string | null;
  client_approved_by: string | null;
};

export type Approval = BaseRecord & {
  agency_id: string;
  timesheet_id: string;
  approver_user_id: string;
  approver_role: UserRole;
  status: TimesheetStatus;
  notes: string | null;
};

export type PayrollExport = BaseRecord & {
  agency_id: string;
  exported_by: string | null;
  week_start: string;
  week_end: string;
  row_count: number;
  file_name: string;
  export_format: "csv";
};

export type SupportTicket = BaseRecord & {
  agency_id: string | null;
  submitted_by: string | null;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  message: string;
  screenshot_url: string | null;
  status: "open" | "closed";
};

export type AuditLog = {
  id: string;
  agency_id: string | null;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

export type Subscription = BaseRecord & {
  agency_id: string;
  plan_id: SubscriptionPlan;
  status: SubscriptionStatus;
  worker_limit: number;
};

export type ClockAgency = {
  id: string;
  name: string;
};

export type ClockClient = {
  id: string;
  agency_id: string;
  name: string;
};

export type ClockSite = {
  id: string;
  agency_id: string;
  client_id: string;
  name: string;
  address_line_1: string | null;
};

export type ClockWorker = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
};

export type ClockStatus = {
  state: "unknown" | "clocked_in" | "on_lunch" | "clocked_out";
  last_action: PunchType | null;
  last_punched_at: string | null;
};

export type ClockPunchResult = {
  ok: boolean;
  message: string;
  punch_id: string | null;
  worker_name: string | null;
  punch_type: PunchType | null;
  punched_at: string | null;
  current_state: ClockStatus["state"];
};

export type DashboardCounts = {
  clients: number;
  sites: number;
  workers: number;
  assignments: number;
  punchesToday: number;
  pendingTimesheets: number;
};
