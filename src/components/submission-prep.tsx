"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { StatusBadge } from "@/components/status-badge";
import type { Campaign, Clip } from "@/lib/types";

export function SubmissionPrep({
  campaigns,
  clips,
}: {
  campaigns: Campaign[];
  clips: Clip[];
}) {
  const router = useRouter();
  const [selectedClipId, setSelectedClipId] = useState(clips[0]?.id ?? "");
  const [postedUrl, setPostedUrl] = useState(clips[0]?.postedUrl ?? "");
  const [submissionLink, setSubmissionLink] = useState(
    clips[0]?.whopSubmissionLink ?? "",
  );
  const [views, setViews] = useState(String(clips[0]?.views ?? 0));
  const [markSubmitted, setMarkSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedClip = useMemo(
    () => clips.find((clip) => clip.id === selectedClipId) ?? null,
    [clips, selectedClipId],
  );
  const selectedCampaign = useMemo(
    () =>
      campaigns.find((campaign) => campaign.id === selectedClip?.campaignId) ?? null,
    [campaigns, selectedClip],
  );

  function syncSelectedClip(nextClipId: string) {
    const nextClip = clips.find((clip) => clip.id === nextClipId);
    setSelectedClipId(nextClipId);
    setPostedUrl(nextClip?.postedUrl ?? "");
    setSubmissionLink(nextClip?.whopSubmissionLink ?? "");
    setViews(String(nextClip?.views ?? 0));
    setMarkSubmitted(false);
    setMessage("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClip) return;

    startTransition(async () => {
      const response = await fetch(`/api/clips/${selectedClip.id}/submission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postedUrl,
          whopSubmissionLink: submissionLink,
          views: Number(views || 0),
          markSubmitted,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setMessage(body.error ?? "Could not save submission prep.");
        return;
      }

      setMessage(
        markSubmitted
          ? "Submission marked as completed. No external auto-submit was triggered."
          : "Submission prep saved. Review the checklist before manual Whop submission.",
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={onSubmit} className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Submission Prep</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Save links, then submit manually
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          ClipFlow AI stores the final URLs and checklist, but it never submits to
          Whop on its own. Human approval is required before you mark anything as
          submitted.
        </p>

        <div className="mt-8 grid gap-5">
          <label className="space-y-2">
            <span className="text-sm font-medium">Clip</span>
            <select
              className="input-base"
              value={selectedClipId}
              onChange={(event) => syncSelectedClip(event.target.value)}
            >
              {clips.map((clip) => {
                const campaign = campaigns.find((item) => item.id === clip.campaignId);
                return (
                  <option key={clip.id} value={clip.id}>
                    {campaign?.name ?? "Campaign"} - {clip.clipTitle}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Final post URL</span>
            <input
              className="input-base"
              value={postedUrl}
              onChange={(event) => setPostedUrl(event.target.value)}
              placeholder="https://tiktok.com/... or https://youtube.com/shorts/..."
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Whop submission link</span>
            <input
              className="input-base"
              value={submissionLink}
              onChange={(event) => setSubmissionLink(event.target.value)}
              placeholder="Paste the submission destination"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Views</span>
            <input
              type="number"
              min="0"
              className="input-base"
              value={views}
              onChange={(event) => setViews(event.target.value)}
            />
          </label>
          <label className="flex items-start gap-3 rounded-[1.4rem] border border-dashed border-[var(--line)] bg-white/70 p-4 text-sm leading-6 text-[var(--ink-soft)]">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded"
              checked={markSubmitted}
              onChange={(event) => setMarkSubmitted(event.target.checked)}
            />
            <span>
              I reviewed the checklist and want to mark this clip as manually
              submitted. This only updates the tracker state.
            </span>
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="button-primary" disabled={isPending}>
            {isPending ? "Saving..." : "Save submission prep"}
          </button>
          <StatusBadge
            status={selectedClip?.whopSubmissionStatus ?? "not-started"}
          />
        </div>
        {message ? (
          <p className="mt-4 text-sm font-medium text-[var(--ink-soft)]">
            {message}
          </p>
        ) : null}
      </form>

      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Checklist</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Pre-submit review
        </h2>
        <div className="mt-6 space-y-5">
          <div className="rounded-[1.6rem] bg-white/70 p-5">
            <p className="font-semibold text-[var(--foreground)]">
              Campaign
            </p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {selectedCampaign?.name ?? "Select a clip to load the checklist."}
            </p>
            {selectedClip?.caption ? (
              <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--ink-soft)]">
                {selectedClip.caption}
              </p>
            ) : null}
          </div>
          <div className="rounded-[1.6rem] bg-white/70 p-5">
            <p className="font-semibold text-[var(--foreground)]">
              Submission checklist
            </p>
            {selectedCampaign?.aiAnalysis?.finalChecklist?.length ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
                {selectedCampaign.aiAnalysis.finalChecklist.map((item) => (
                  <li key={item} className="rounded-2xl bg-white px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Extract campaign requirements first to generate the checklist.
              </p>
            )}
          </div>
          <div className="rounded-[1.6rem] bg-white/70 p-5">
            <p className="font-semibold text-[var(--foreground)]">
              Risk reminders
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
              <li className="rounded-2xl bg-white px-4 py-3">
                Confirm the final post uses only approved assets.
              </li>
              <li className="rounded-2xl bg-white px-4 py-3">
                Verify the disclosure appears exactly where the campaign requires it.
              </li>
              <li className="rounded-2xl bg-white px-4 py-3">
                Submit through Whop manually after you are satisfied with the post.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
