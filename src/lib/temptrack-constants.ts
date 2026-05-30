export const ROLE_LABELS = {
  platform_owner: "Platform Owner",
  agency_admin: "Agency Admin",
  client_manager: "Client Manager",
  worker: "Worker",
} as const;

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 99,
    workerLimit: 50,
    description: "Best for smaller agencies running one or two client accounts.",
  },
  {
    id: "growth",
    name: "Growth",
    price: 199,
    workerLimit: 150,
    description: "Built for agencies expanding across multiple sites and shifts.",
  },
  {
    id: "pro",
    name: "Pro",
    price: 399,
    workerLimit: 500,
    description: "For multi-client agencies with large field workforces.",
  },
] as const;

export const PUNCH_ACTIONS = [
  { id: "clock_in", label: "Clock In" },
  { id: "start_lunch", label: "Start Lunch" },
  { id: "end_lunch", label: "End Lunch" },
  { id: "clock_out", label: "Clock Out" },
] as const;

export const TIMESHEET_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const SUPPORT_CATEGORIES = [
  "Clock In Issue",
  "Approval Problem",
  "Payroll Export",
  "Billing Question",
  "General Help",
] as const;

export const SETUP_STEPS = [
  "Create a client",
  "Create a job site",
  "Add a worker",
  "Assign the worker to the site",
  "Generate and print the site QR code",
] as const;
