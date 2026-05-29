import { CampaignForm } from "@/components/campaign-form";
import { PageShell } from "@/components/page-shell";

export default function NewCampaignPage() {
  return (
    <PageShell
      eyebrow="Add Campaign"
      title="Intake a new Whop clipping deal"
      description="Capture the campaign URLs, requirements, platform, deadline, and official asset source in one place before any AI work starts."
    >
      <CampaignForm />
    </PageShell>
  );
}
