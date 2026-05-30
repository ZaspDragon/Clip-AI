"use client";

import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({
  title,
  eyebrow,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="glass-card rounded-[2rem] p-6 sm:p-8">
      {(title || eyebrow || description || action) && (
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
            {title ? (
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            ) : null}
            {description ? (
              <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="glass-card rounded-[1.8rem] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{hint}</p>
    </div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] bg-white/65 px-5 py-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{message}</p>
    </div>
  );
}
