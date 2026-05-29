import { CampaignLab } from "@/components/campaign-lab";
import { PageShell } from "@/components/page-shell";
import { listCampaigns } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();

  return (
    <PageShell
      eyebrow="Campaign Lab"
      title="Requirement extraction and caption generation"
      description="Run OpenAI or n8n-backed campaign analysis, keep manual requirements as the source of truth, and generate caption packs that stay inside the brief."
    >
      <CampaignLab initialCampaigns={campaigns} />
    </PageShell>
  );
}
