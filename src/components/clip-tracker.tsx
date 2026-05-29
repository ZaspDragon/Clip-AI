"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/status-badge";
import {
  OPUS_CLIP_STATUSES,
  PLATFORMS,
  SUBMISSION_STATUSES,
  type OpusClipStatus,
  type Platform,
  type SubmissionStatus,
  type VideoFileStatus,
  type Campaign,
  type Clip,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ClipFormState = {
  campaignId: string;
  clipTitle: string;
  platform: Platform;
  caption: string;
  postedUrl: string;
  views: number;
  whopSubmissionStatus: SubmissionStatus;
  opusClipStatus: OpusClipStatus;
  videoFileStatus: VideoFileStatus;
};

export function ClipTracker({
  campaigns,
  clips,
}: {
  campaigns: Campaign[];
  clips: Clip[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<ClipFormState>({
    campaignId: campaigns[0]?.id ?? "",
    clipTitle: "",
    platform: campaigns[0]?.platform ?? "Cross-platform",
    caption: "",
    postedUrl: "",
    views: 0,
    whopSubmissionStatus: "not-started",
    opusClipStatus: "not-started",
    videoFileStatus: "ready",
  });
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const response = await fetch("/api/clips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setMessage(body.error ?? "Could not add the clip.");
        return;
      }

      setMessage("Clip added to the manual tracker.");
      setForm({
        campaignId: campaigns[0]?.id ?? "",
        clipTitle: "",
        platform: campaigns[0]?.platform ?? "Cross-platform",
        caption: "",
        postedUrl: "",
        views: 0,
        whopSubmissionStatus: "not-started",
        opusClipStatus: "not-started",
        videoFileStatus: "ready",
      });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={onSubmit} className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Add Clip</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Manual clip tracker
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          No platform APIs required. Save the clip title, caption, posted link,
          views, and Whop submission status in one place while you handle uploads
          manually.
        </p>

        <div className="mt-8 grid gap-5">
          <label className="space-y-2">
            <span className="text-sm font-medium">Campaign</span>
            <select
              className="input-base"
              value={form.campaignId}
              onChange={(event) =>
                setForm((current) => ({ ...current, campaignId: event.target.value }))
              }
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Clip title</span>
            <input
              required
              className="input-base"
              value={form.clipTitle}
              onChange={(event) =>
                setForm((current) => ({ ...current, clipTitle: event.target.value }))
              }
              placeholder="Example: 3 reasons this workflow is easier"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Platform</span>
            <select
              className="input-base"
              value={form.platform}
              onChange={(event) =>
                setForm((current) => ({
                    ...current,
                    platform: event.target.value as Platform,
                  }))
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
            <span className="text-sm font-medium">Caption</span>
            <textarea
              className="input-base min-h-32"
              value={form.caption}
              onChange={(event) =>
                setForm((current) => ({ ...current, caption: event.target.value }))
              }
              placeholder="Paste the final or draft caption you plan to post."
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Posted URL</span>
              <input
                className="input-base"
                value={form.postedUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, postedUrl: event.target.value }))
                }
                placeholder="Paste after upload"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Views</span>
              <input
                type="number"
                min="0"
                className="input-base"
                value={String(form.views)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    views: Number(event.target.value || 0),
                  }))
                }
              />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Whop submission status</span>
              <select
                className="input-base"
                value={form.whopSubmissionStatus}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    whopSubmissionStatus: event.target.value as SubmissionStatus,
                  }))
                }
              >
                {SUBMISSION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Create clip in Opus</span>
              <select
                className="input-base"
                value={form.opusClipStatus}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    opusClipStatus: event.target.value as OpusClipStatus,
                  }))
                }
              >
                {OPUS_CLIP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="button-primary" disabled={isPending}>
            {isPending ? "Saving..." : "Add clip"}
          </button>
          <span className="text-sm text-[var(--muted)]">
            Manual workflow only: create in Opus, upload, paste URL, then submit to Whop.
          </span>
        </div>

        {message ? (
          <p className="mt-4 text-sm font-medium text-[var(--ink-soft)]">
            {message}
          </p>
        ) : null}
      </form>

      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Queue</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Clip tracker
        </h2>
        <div className="mt-6 space-y-4">
          {clips.map((clip) => {
            const campaign = campaigns.find((item) => item.id === clip.campaignId);

            return (
              <article
                key={clip.id}
                className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      {campaign?.name ?? "Unknown campaign"}
                    </p>
                    <h3 className="text-lg font-semibold">{clip.clipTitle}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      {clip.platform} · Deadline{" "}
                      {campaign ? formatDate(campaign.deadline) : "Not set"}
                    </p>
                  </div>
                  <StatusBadge status={clip.whopSubmissionStatus} />
                </div>
                {clip.caption ? (
                  <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--ink-soft)]">
                    {clip.caption}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 text-sm text-[var(--ink-soft)] sm:grid-cols-4">
                  <TrackerPill label="Opus Clip" value={clip.opusClipStatus} />
                  <TrackerPill label="Platform" value={clip.platform} />
                  <TrackerPill
                    label="Posted URL"
                    value={clip.postedUrl ? "Saved" : "Pending"}
                  />
                  <TrackerPill label="Views" value={String(clip.views)} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
                  <ReminderItem
                    done={clip.opusClipStatus !== "not-started"}
                    text="Create clip in Opus"
                  />
                  <ReminderItem
                    done={Boolean(clip.postedUrl)}
                    text={`Upload to ${clip.platform}`}
                  />
                  <ReminderItem
                    done={Boolean(clip.postedUrl)}
                    text="Paste posted URL"
                  />
                  <ReminderItem
                    done={clip.whopSubmissionStatus === "submitted"}
                    text="Submit to Whop"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TrackerPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium capitalize">{value.replace(/-/g, " ")}</p>
    </div>
  );
}

function ReminderItem({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="rounded-2xl bg-white/75 px-4 py-3">
      <span className="font-semibold text-[var(--foreground)]">
        {done ? "Done" : "Next"}
      </span>{" "}
      {text}
    </div>
  );
}
