import Link from "next/link";
import type { ReactNode } from "react";

import { Navigation } from "@/components/navigation";

type PageShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function PageShell({
  title,
  description,
  eyebrow = "ClipFlow AI",
  action,
  children,
}: PageShellProps) {
  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="glass-card fade-up rounded-[2rem] p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="section-kicker">{eyebrow}</div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                    {title}
                  </h1>
                  <span className="pill">Whop-safe workflow</span>
                  <span className="pill">Human approval only</span>
                </div>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  {description}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <Navigation />
              <div className="flex flex-wrap gap-3">
                {action}
                <Link href="/campaigns/new" className="button-primary">
                  Add campaign
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
