import { PageShell } from "@/components/page-shell";
import { SubmissionPrep } from "@/components/submission-prep";
import { listCampaigns, listClips } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const [campaigns, clips] = await Promise.all([listCampaigns(), listClips()]);

  return (
    <PageShell
      eyebrow="Manual Approval"
      title="Prepare submissions without auto-posting"
      description="Store final URLs, keep the Whop submission link close by, and surface the final campaign checklist before a human manually submits."
    >
      <SubmissionPrep campaigns={campaigns} clips={clips} />
    </PageShell>
  );
}
