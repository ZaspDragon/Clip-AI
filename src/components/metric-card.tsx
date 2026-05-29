import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
  accent?: ReactNode;
};

export function MetricCard({ label, value, hint, accent }: MetricCardProps) {
  return (
    <div className="glass-card fade-up rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            {label}
          </p>
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {value}
          </p>
        </div>
        {accent}
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{hint}</p>
    </div>
  );
}
