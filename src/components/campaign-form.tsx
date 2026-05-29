"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PLATFORMS } from "@/lib/types";

type FormState = {
  name: string;
  whopSectionLink: string;
  whopCampaignUrl: string;
  requirementsText: string;
  officialAssetLink: string;
  platform: (typeof PLATFORMS)[number];
  deadline: string;
};

const initialState: FormState = {
  name: "",
  whopSectionLink: "",
  whopCampaignUrl: "",
  requirementsText: "",
  officialAssetLink: "",
  platform: "Cross-platform",
  deadline: "",
};

export function CampaignForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setMessage(body.error ?? "Could not save the campaign.");
        return;
      }

      setMessage("Campaign saved. You can process it with AI from the campaign dashboard.");
      setForm(initialState);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <form onSubmit={onSubmit} className="glass-card rounded-[2rem] p-6 sm:p-8">
        <div className="space-y-2">
          <p className="section-kicker">Add Campaign</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Save the brief before you ask AI to work on it
          </h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            ClipFlow AI intentionally avoids aggressive Whop scraping. If the
            Whop page is blocked or rate-limited, paste the requirements manually
            here and keep the official asset link attached.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">Campaign name</span>
            <input
              required
              className="input-base"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Example: Creator Spring Launch"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Whop link</span>
            <input
              className="input-base"
              value={form.whopSectionLink}
              onChange={(event) => update("whopSectionLink", event.target.value)}
              placeholder="https://whop.com/..."
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Content rewards/deal link</span>
            <input
              className="input-base"
              value={form.whopCampaignUrl}
              onChange={(event) => update("whopCampaignUrl", event.target.value)}
              placeholder="https://whop.com/content-rewards/... or deal page"
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">Campaign requirements text</span>
            <textarea
              required
              className="input-base min-h-44"
              value={form.requirementsText}
              onChange={(event) => update("requirementsText", event.target.value)}
              placeholder="Paste the campaign rules, allowed hashtags, disclosure requirements, asset notes, and rejection risks."
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Official asset link</span>
            <input
              className="input-base"
              value={form.officialAssetLink}
              onChange={(event) => update("officialAssetLink", event.target.value)}
              placeholder="https://drive.google.com/... or approved asset folder"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Platform</span>
            <select
              className="input-base"
              value={form.platform}
              onChange={(event) =>
                update("platform", event.target.value as FormState["platform"])
              }
            >
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Deadline</span>
            <input
              type="date"
              required
              className="input-base"
              value={form.deadline}
              onChange={(event) => update("deadline", event.target.value)}
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="submit" className="button-primary" disabled={isPending}>
            {isPending ? "Saving..." : "Save campaign"}
          </button>
          <span className="text-sm text-[var(--muted)]">
            The app uses manual upload and link tracking for now.
          </span>
        </div>
        {message ? (
          <p className="mt-4 text-sm font-medium text-[var(--ink-soft)]">
            {message}
          </p>
        ) : null}
      </form>

      <aside className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Safety Rails</p>
        <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--muted)]">
          <div className="rounded-3xl bg-white/70 p-4">
            <p className="font-semibold text-[var(--foreground)]">
              Manual requirements fallback
            </p>
            <p className="mt-2">
              If Whop is inaccessible, paste the requirements. ClipFlow AI does
              not depend on aggressive scraping.
            </p>
          </div>
          <div className="rounded-3xl bg-white/70 p-4">
            <p className="font-semibold text-[var(--foreground)]">
              Official asset-only workflow
            </p>
            <p className="mt-2">
              The asset link is passed to your n8n webhook and the local AI
              fallback so unsupported media can be flagged before posting.
            </p>
          </div>
          <div className="rounded-3xl bg-white/70 p-4">
            <p className="font-semibold text-[var(--foreground)]">
              Manual-first publishing
            </p>
            <p className="mt-2">
              No YouTube, TikTok, Instagram, Opus, or Whop APIs are required yet.
              You can create clips and paste links manually.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
