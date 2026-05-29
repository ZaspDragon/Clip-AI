import { NextResponse } from "next/server";

import { extractCampaignRequirements } from "@/lib/ai";
import { getCampaign, getSettings, saveRequirementAnalysis } from "@/lib/repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [campaign, settings] = await Promise.all([getCampaign(id), getSettings()]);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const analysis = await extractCampaignRequirements(
      campaign,
      settings.n8nWebhookUrl,
    );
    await saveRequirementAnalysis(id, analysis);

    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed." },
      { status: 500 },
    );
  }
}
