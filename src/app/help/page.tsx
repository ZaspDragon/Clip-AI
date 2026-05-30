"use client";

import { AppShell } from "@/components/temptrack/app-shell";
import { AuthGuard } from "@/components/temptrack/auth-guard";
import { SectionCard } from "@/components/temptrack/ui";

const HELP_ITEMS = [
  {
    title: "Create a client",
    steps: [
      "Open the Clients page.",
      "Enter the client company name and optional contact details.",
      "Save the client so you can add job sites under that account.",
    ],
  },
  {
    title: "Create a job site",
    steps: [
      "Open the Job Sites page.",
      "Choose the client company and add the site name and address.",
      "Save the site so it can generate its own QR poster.",
    ],
  },
  {
    title: "Add workers",
    steps: [
      "Open the Workers page.",
      "Add the worker name, phone number, optional PIN, and optional pay rate.",
      "Save the worker. No worker login account is required.",
    ],
  },
  {
    title: "Print QR codes",
    steps: [
      "Open the Site QR page.",
      "Choose the job site you want to activate.",
      "Copy the link, download the QR image, or print the poster directly.",
    ],
  },
  {
    title: "Approve timesheets",
    steps: [
      "Client managers log in to the Approvals page.",
      "Review the generated weekly hours and add notes if needed.",
      "Approve or reject the timesheet.",
    ],
  },
  {
    title: "Export payroll",
    steps: [
      "Open the Payroll Export page.",
      "Review the approved timesheets waiting for payroll.",
      "Export the approved CSV and share it with payroll processing.",
    ],
  },
];

export default function HelpPage() {
  return (
    <AuthGuard allowedRoles={["platform_owner", "agency_admin", "client_manager"]}>
      <AppShell
        title="Help center"
        description="Use this guide to get an agency live quickly and move from setup to site QR punching, approvals, and payroll export."
      >
        <div className="grid gap-6 md:grid-cols-2">
          {HELP_ITEMS.map((item) => (
            <SectionCard key={item.title} title={item.title}>
              <ol className="grid gap-3">
                {item.steps.map((step, index) => (
                  <li
                    key={step}
                    className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-4 text-sm leading-6 text-[var(--muted)]"
                  >
                    <span className="mr-2 font-semibold text-[var(--foreground)]">
                      {index + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </SectionCard>
          ))}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
