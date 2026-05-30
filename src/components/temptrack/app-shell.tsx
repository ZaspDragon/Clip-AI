"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  Clock3,
  FolderClock,
  HelpCircle,
  LogOut,
  QrCode,
  Settings2,
  ShieldCheck,
  Users2,
  WalletCards,
} from "lucide-react";

import { useAuth } from "@/components/temptrack/use-auth";
import { ROLE_LABELS } from "@/lib/temptrack-constants";
import type { UserRole } from "@/lib/temptrack-types";
import { cn } from "@/lib/temptrack-utils";

type AppShellProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof Building2;
  roles: UserRole[];
}> = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: ShieldCheck,
    roles: ["platform_owner", "agency_admin", "client_manager"],
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Building2,
    roles: ["platform_owner", "agency_admin"],
  },
  {
    href: "/sites",
    label: "Job Sites",
    icon: FolderClock,
    roles: ["platform_owner", "agency_admin"],
  },
  {
    href: "/workers",
    label: "Workers",
    icon: Users2,
    roles: ["platform_owner", "agency_admin"],
  },
  {
    href: "/assignments",
    label: "Assignments",
    icon: ClipboardCheck,
    roles: ["platform_owner", "agency_admin"],
  },
  {
    href: "/qr",
    label: "Site QR",
    icon: QrCode,
    roles: ["platform_owner", "agency_admin"],
  },
  {
    href: "/timesheets",
    label: "Timesheets",
    icon: Clock3,
    roles: ["platform_owner", "agency_admin"],
  },
  {
    href: "/approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    roles: ["platform_owner", "agency_admin", "client_manager"],
  },
  {
    href: "/payroll",
    label: "Payroll Export",
    icon: WalletCards,
    roles: ["platform_owner", "agency_admin"],
  },
  {
    href: "/support",
    label: "Support",
    icon: HelpCircle,
    roles: ["platform_owner", "agency_admin", "client_manager"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2,
    roles: ["platform_owner", "agency_admin", "client_manager"],
  },
];

export function AppShell({ title, description, action, children }: AppShellProps) {
  const pathname = usePathname();
  const { agency, profile, signOut } = useAuth();

  const navItems = useMemo(() => {
    if (!profile) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(profile.role));
  }, [profile]);

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="glass-card rounded-[2rem] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="section-kicker">TempTrack Pro</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {title}
                </h1>
                {profile ? (
                  <span className="pill">{ROLE_LABELS[profile.role]}</span>
                ) : null}
                {agency ? <span className="pill">{agency.name}</span> : null}
              </div>
              <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                {description}
              </p>
            </div>
            <div className="flex flex-col gap-4 lg:items-end">
              <div className="flex flex-wrap gap-2">
                {navItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "pill transition-transform hover:-translate-y-0.5",
                        active &&
                          "border-transparent bg-[var(--navy)] text-white shadow-lg shadow-slate-900/15",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/clock" className="button-secondary">
                  Open worker clock
                </Link>
                {action}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="button-ghost"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
