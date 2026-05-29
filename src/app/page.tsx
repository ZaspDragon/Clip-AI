import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Film,
  Layers3,
  ShieldAlert,
  Send,
  Wallet,
} from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { listCampaigns, listClips } from "@/lib/repository";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [campaigns, clips] = await Promise.all([listCampaigns(), listClips()]);

  const activeCampaigns = campaigns.filter((item) => item.status === "active").length;
  const readyToClip = campaigns.filter((item) => item.status === "ready-to-clip").length;
  const postedCampaigns = campaigns.filter((item) => item.status === "posted").length;
  const submittedCampaigns = campaigns.filter((item) => item.status === "submitted").length;
  const paidCampaigns = campaigns.filter((item) => item.status === "paid").length;
  const rejectedCampaigns = campaigns.filter((item) => item.status === "rejected").length;

  return (
    <PageShell
      eyebrow="Creator Ops"
      title="ClipFlow AI"
      description="A full-stack Whop content reward workspace for campaign intake, rule extraction, caption generation, clip tracking, and manual submission prep."
      action={
        <Link href="/campaigns" className="button-secondary">
          Open campaign lab
        </Link>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Active campaigns"
          value={activeCampaigns}
          hint="Campaigns currently in rotation and waiting on manual production work."
          accent={<Layers3 className="text-[var(--accent-deep)]" />}
        />
        <MetricCard
          label="Ready to clip"
          value={readyToClip}
          hint="Campaigns with enough processing done to move into Opus and editing."
          accent={<Film className="text-[var(--accent-deep)]" />}
        />
        <MetricCard
          label="Posted"
          value={postedCampaigns}
          hint="Campaigns with live posts waiting for link tracking or submission follow-through."
          accent={<Send className="text-[var(--accent-deep)]" />}
        />
        <MetricCard
          label="Submitted"
          value={submittedCampaigns}
          hint="Campaigns you have manually submitted through Whop."
          accent={<CheckCircle2 className="text-[var(--accent-deep)]" />}
        />
        <MetricCard
          label="Paid"
          value={paidCampaigns}
          hint="Campaigns that have cleared the workflow and been paid out."
          accent={<Wallet className="text-[var(--accent-deep)]" />}
        />
        <MetricCard
          label="Rejected"
          value={rejectedCampaigns}
          hint="Campaigns needing rework because the post or submission was not accepted."
          accent={<ShieldAlert className="text-[var(--accent-deep)]" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">Workflow Pulse</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Campaigns moving right now
            </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/clips" className="button-secondary">
                Track clips
              </Link>
              <Link href="/submissions" className="button-primary">
                Prep submissions
              </Link>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <StatusBadge status={campaign.status} />
                      <span className="pill">{campaign.platform}</span>
                      {campaign.generatedCaptions ? (
                        <span className="pill">AI processed</span>
                      ) : null}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Deadline {formatDate(campaign.deadline)}
                    </p>
                    <p className="max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
                      {campaign.aiAnalysis?.summary ??
                        "Requirements are saved and ready for AI processing."}
                    </p>
                  </div>
                  <Link
                    href="/campaigns"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]"
                  >
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-[2rem] p-6 sm:p-8">
            <p className="section-kicker">Tracker</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Manual workflow board
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Posted clips" value={clips.filter((clip) => clip.postedUrl).length} icon={<Send className="h-4 w-4" />} />
              <MiniStat
                label="Submitted clips"
                value={clips.filter((clip) => clip.whopSubmissionStatus === "submitted").length}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <MiniStat label="Rejected clips" value={clips.filter((clip) => clip.whopSubmissionStatus === "rejected").length} icon={<ShieldAlert className="h-4 w-4" />} />
              <MiniStat label="Total clips" value={clips.length} icon={<Film className="h-4 w-4" />} />
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-6 sm:p-8">
            <p className="section-kicker">Guardrails</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Manual workflow reminders
            </h2>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-[var(--ink-soft)]">
              <li className="rounded-2xl bg-white/75 px-4 py-3">
                1. Create the clip in Opus.
              </li>
              <li className="rounded-2xl bg-white/75 px-4 py-3">
                2. Upload to YouTube, TikTok, or Instagram manually.
              </li>
              <li className="rounded-2xl bg-white/75 px-4 py-3">
                3. Paste the posted URL and keep view counts up to date.
              </li>
              <li className="rounded-2xl bg-white/75 px-4 py-3">
                4. Submit to Whop manually when the checklist is complete.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.6rem] bg-white/75 p-4">
      <div className="flex items-center justify-between gap-3 text-[var(--muted)]">
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">
          {label}
        </span>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
