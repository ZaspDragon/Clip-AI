import { ClipTracker } from "@/components/clip-tracker";
import { PageShell } from "@/components/page-shell";
import { listCampaigns, listClips } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const [campaigns, clips] = await Promise.all([listCampaigns(), listClips()]);

  return (
    <PageShell
      eyebrow="Production Queue"
      title="Track clip production"
      description="Keep campaign ideas, Opus Clip progress, video file readiness, posting state, and submission status aligned in one tracker."
    >
      <ClipTracker campaigns={campaigns} clips={clips} />
    </PageShell>
  );
}
