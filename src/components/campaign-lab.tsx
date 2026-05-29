"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/status-badge";
import { CAMPAIGN_STATUSES, type Campaign } from "@/lib/types";
import { formatDate, platformHint } from "@/lib/utils";

export function CampaignLab({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, Campaign["status"]>>(
    Object.fromEntries(
      initialCampaigns.map((campaign) => [campaign.id, campaign.status]),
    ),
  );
  const [isPending, startTransition] = useTransition();

  async function runAction(campaignId: string) {
    setMessage("");
    setBusyKey(`${campaignId}:process`);

    startTransition(async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/process`, {
        method: "POST",
      });

      const body = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok) {
        setMessage(body.error ?? "Could not complete that step.");
        setBusyKey("");
        return;
      }

      setMessage("AI processing finished. Rules, checklist, captions, and warnings are ready.");
      setBusyKey("");
      router.refresh();
    });
  }

  async function saveStatus(campaignId: string) {
    setMessage("");
    setBusyKey(`${campaignId}:status`);

    startTransition(async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: statusDrafts[campaignId],
        }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(body.error ?? "Could not save the campaign status.");
        setBusyKey("");
        return;
      }

      setMessage("Campaign status updated.");
      setBusyKey("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className="glass-card rounded-[1.6rem] px-5 py-4 text-sm font-medium text-[var(--ink-soft)]">
          {message}
        </div>
      ) : null}
      {initialCampaigns.length === 0 ? (
        <div className="glass-card rounded-[2rem] p-8 text-center">
          <p className="text-lg font-semibold">No campaigns yet.</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Add your first Whop content reward campaign to unlock the extractor,
            n8n processing, and manual submission workflow.
          </p>
        </div>
      ) : null}
      {initialCampaigns.map((campaign) => (
        <section
          key={campaign.id}
          className="glass-card fade-up rounded-[2rem] p-6 sm:p-8"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {campaign.name}
                </h2>
                <StatusBadge status={campaign.status} />
                <span className="pill">{campaign.platform}</span>
                <span className="pill">Deadline {formatDate(campaign.deadline)}</span>
              </div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                {platformHint(campaign.platform)}
              </p>
              <div className="grid gap-3 text-sm text-[var(--ink-soft)] sm:grid-cols-2">
                <div className="rounded-3xl bg-white/70 p-4">
                  <p className="font-semibold text-[var(--foreground)]">
                    Whop + rewards links
                  </p>
                  <div className="mt-2 space-y-2">
                    <a
                      className="block break-all underline decoration-[var(--accent)] underline-offset-4"
                      href={campaign.whopSectionLink || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {campaign.whopSectionLink || "Whop link not set"}
                    </a>
                    <a
                      className="block break-all underline decoration-[var(--accent)] underline-offset-4"
                      href={campaign.whopCampaignUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {campaign.whopCampaignUrl || "Content rewards/deal link not set"}
                    </a>
                  </div>
                </div>
                <div className="rounded-3xl bg-white/70 p-4">
                  <p className="font-semibold text-[var(--foreground)]">
                    Official asset link
                  </p>
                  <a
                    className="mt-2 block break-all underline decoration-[var(--accent)] underline-offset-4"
                    href={campaign.officialAssetLink || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {campaign.officialAssetLink || "Asset link not set"}
                  </a>
                </div>
              </div>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-3">
              <button
                className="button-primary"
                disabled={isPending}
                onClick={() => void runAction(campaign.id)}
              >
                {busyKey === `${campaign.id}:process`
                  ? "Processing..."
                  : "Process with AI"}
              </button>
              <p className="text-xs leading-5 text-[var(--muted)]">
                Sends campaign data to your n8n webhook first, then falls back
                to local AI processing if needed.
              </p>
              <div className="rounded-[1.2rem] bg-white/70 p-3">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-[var(--foreground)]">
                    Campaign status
                  </span>
                  <select
                    className="input-base"
                    value={statusDrafts[campaign.id] ?? campaign.status}
                    onChange={(event) =>
                      setStatusDrafts((current) => ({
                        ...current,
                        [campaign.id]: event.target.value as Campaign["status"],
                      }))
                    }
                  >
                    {CAMPAIGN_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button-secondary mt-3 w-full"
                  disabled={isPending}
                  onClick={() => void saveStatus(campaign.id)}
                  type="button"
                >
                  {busyKey === `${campaign.id}:status`
                    ? "Saving status..."
                    : "Save status"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="rounded-[1.6rem] bg-white/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Requirements paste
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--ink-soft)]">
                  {campaign.requirementsText}
                </p>
              </div>

              <div className="rounded-[1.6rem] bg-white/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  AI processing output
                </p>
                {campaign.aiAnalysis ? (
                  <div className="mt-4 space-y-4 text-sm leading-6">
                    <p className="font-medium text-[var(--foreground)]">
                      {campaign.aiAnalysis.summary}
                    </p>
                    <RuleList
                      title="Required tags"
                      items={campaign.aiAnalysis.requiredTags}
                    />
                    <RuleList
                      title="Required disclosure"
                      items={
                        campaign.aiAnalysis.requiredDisclosure
                          ? [campaign.aiAnalysis.requiredDisclosure]
                          : ["None detected"]
                      }
                    />
                    <RuleList
                      title="Banned hashtags"
                      items={campaign.aiAnalysis.bannedHashtags}
                    />
                    <RuleList
                      title="Asset rules"
                      items={campaign.aiAnalysis.assetRules}
                    />
                    <RuleList
                      title="Platform rules"
                      items={campaign.aiAnalysis.platformRules}
                    />
                    <RuleList
                      title="Rejection risks"
                      items={campaign.aiAnalysis.rejectionRisks}
                    />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    Process the campaign to send it through your n8n webhook and
                    save the extracted rules, checklist, and rejection warnings.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.6rem] bg-white/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Final checklist
                </p>
                {campaign.aiAnalysis?.finalChecklist?.length ? (
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
                    {campaign.aiAnalysis.finalChecklist.map((item) => (
                      <li key={item} className="rounded-2xl bg-white px-4 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    No checklist yet. Run extraction first.
                  </p>
                )}
              </div>

              <div className="rounded-[1.6rem] bg-white/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Caption generator
                </p>
                {campaign.generatedCaptions ? (
                  <div className="mt-4 space-y-5">
                    <CaptionColumn
                      title="YouTube Shorts titles"
                      items={campaign.generatedCaptions.youtubeShortTitles}
                    />
                    <CaptionColumn
                      title="YouTube descriptions"
                      items={campaign.generatedCaptions.youtubeDescriptions}
                    />
                    <CaptionColumn
                      title="TikTok captions"
                      items={campaign.generatedCaptions.tiktokCaptions}
                    />
                    <CaptionColumn
                      title="Instagram captions"
                      items={campaign.generatedCaptions.instagramCaptions}
                    />
                    <RuleList
                      title="Compliance notes"
                      items={campaign.generatedCaptions.complianceNotes}
                    />
                    <RuleList
                      title="Risk flags"
                      items={
                        campaign.generatedCaptions.riskyCaptions.length > 0
                          ? campaign.generatedCaptions.riskyCaptions.map(
                              (risk) =>
                                `${risk.platform}: ${risk.reason} (${risk.caption})`,
                            )
                          : ["No risky captions were detected in the current set."]
                      }
                    />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    AI processing will return titles, descriptions, captions, and
                    compliance notes for manual posting.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function RuleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      <ul className="mt-2 space-y-2 text-[var(--ink-soft)]">
        {(items.length > 0 ? items : ["None"]).map((item) => (
          <li key={`${title}-${item}`} className="rounded-2xl bg-white px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CaptionColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ text: string; risky: boolean; reason?: string }>;
}) {
  return (
    <div>
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      <div className="mt-2 space-y-3">
        {items.map((item) => (
          <div
            key={`${title}-${item.text}`}
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
          >
            <p className="text-sm leading-6 text-[var(--ink-soft)]">{item.text}</p>
            {item.risky ? (
              <p className="mt-2 text-xs font-semibold text-[var(--danger)]">
                Risk: {item.reason}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
