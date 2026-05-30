"use client";

import Link from "next/link";

type SetupCardProps = {
  title: string;
  message: string;
};

export function SetupCard({ title, message }: SetupCardProps) {
  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <div className="glass-card w-full rounded-[2rem] p-8 sm:p-10">
          <p className="section-kicker">Setup required</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">{message}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="button-primary">
              Create an agency
            </Link>
            <Link href="/login" className="button-secondary">
              Admin login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
