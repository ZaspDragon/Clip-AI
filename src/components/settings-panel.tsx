"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AppSettings } from "@/lib/types";

export function SettingsPanel({
  initialSettings,
  runtime,
}: {
  initialSettings: AppSettings;
  runtime: {
    hasSupabase: boolean;
    hasOpenAI: boolean;
  };
}) {
  const router = useRouter();
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(initialSettings.n8nWebhookUrl);
  const [defaultDisclosure, setDefaultDisclosure] = useState(
    initialSettings.defaultDisclosure,
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          n8nWebhookUrl,
          defaultDisclosure,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setMessage(body.error ?? "Could not save settings.");
        return;
      }

      setMessage("Settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={onSubmit} className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Integrations</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Configure the automation layer
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Save the n8n webhook URL used for outbound campaign payloads. ClipFlow
          AI can receive generated checklists or captions back on the callback
          route, but manual review still decides what gets posted or submitted.
        </p>

        <div className="mt-8 grid gap-5">
          <label className="space-y-2">
            <span className="text-sm font-medium">n8n webhook URL</span>
            <input
              className="input-base"
              value={n8nWebhookUrl}
              onChange={(event) => setN8nWebhookUrl(event.target.value)}
              placeholder="https://your-n8n-instance/webhook/clipflow-ai"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Default disclosure fallback</span>
            <input
              className="input-base"
              value={defaultDisclosure}
              onChange={(event) => setDefaultDisclosure(event.target.value)}
              placeholder="#ad"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="button-primary" disabled={isPending}>
            {isPending ? "Saving..." : "Save settings"}
          </button>
          <span className="pill">
            {runtime.hasOpenAI ? "OpenAI ready" : "OpenAI fallback mode"}
          </span>
          <span className="pill">
            {runtime.hasSupabase ? "Supabase connected" : "Demo datastore active"}
          </span>
        </div>
        {message ? (
          <p className="mt-4 text-sm font-medium text-[var(--ink-soft)]">
            {message}
          </p>
        ) : null}
      </form>

      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">n8n Flow</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Suggested webhook contract
        </h2>
        <div className="mt-6 space-y-4 text-sm leading-6 text-[var(--ink-soft)]">
          <div className="rounded-[1.6rem] bg-white/70 p-5">
            <p className="font-semibold text-[var(--foreground)]">
              Outbound request
            </p>
            <p className="mt-2">
              ClipFlow posts `event`, `campaign`, `requestedAt`, and `callbackUrl`
              to your webhook when you run extraction or caption generation.
            </p>
          </div>
          <div className="rounded-[1.6rem] bg-white/70 p-5">
            <p className="font-semibold text-[var(--foreground)]">
              Callback route
            </p>
            <p className="mt-2">
              Return JSON directly from n8n for a synchronous response, or POST
              to <code>/api/n8n/callback</code> later with
              <code>campaignId</code> plus <code>extraction</code> and/or
              <code>captions</code>.
            </p>
          </div>
          <div className="rounded-[1.6rem] bg-white/70 p-5">
            <p className="font-semibold text-[var(--foreground)]">
              Safety guardrails
            </p>
            <ul className="mt-2 space-y-2">
              <li>Do not scrape Whop aggressively inside the workflow.</li>
              <li>Use official assets only.</li>
              <li>Include FTC disclosures when required.</li>
              <li>Block extra hashtags if the campaign forbids them.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
