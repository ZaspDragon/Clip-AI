import type {
  ClockStatus,
  Punch,
  SubscriptionPlan,
  UserProfile,
} from "@/lib/temptrack-types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatHours(value: number | null | undefined) {
  if (value == null) return "0.00";
  return value.toFixed(2);
}

export function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function last4(value: string | null | undefined) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
}

export function getWorkerStatusLabel(status: ClockStatus["state"]) {
  switch (status) {
    case "clocked_in":
      return "Clocked in";
    case "on_lunch":
      return "On lunch";
    case "clocked_out":
      return "Clocked out";
    default:
      return "Ready to punch";
  }
}

export function getPlanWorkerLimit(planId: SubscriptionPlan) {
  switch (planId) {
    case "growth":
      return 150;
    case "pro":
      return 500;
    default:
      return 50;
  }
}

export function weekStartForDate(value: string) {
  const date = new Date(value);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function weekEndFromStart(weekStart: string) {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function summarizeLatestPunch(punch: Punch | null) {
  if (!punch) return "No punches recorded yet.";
  return `${humanizePunchType(punch.punch_type)} saved at ${formatTime(punch.punched_at)}.`;
}

export function humanizePunchType(punchType: string) {
  return punchType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPostLoginPath(profile: UserProfile | null | undefined) {
  if (!profile) return "/dashboard";
  if (profile.role === "client_manager") return "/approvals";
  return "/dashboard";
}

export function toCsv(rows: Array<Record<string, string | number | null>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null) => {
    const text = value == null ? "" : String(value);
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
