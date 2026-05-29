import { NextResponse } from "next/server";

import { generateCampaignCaptions } from "@/lib/ai";
import { getCampaign, getSettings, saveGeneratedCaptions } from "@/lib/repository";

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

    const captions = await generateCampaignCaptions(
      campaign,
      settings.n8nWebhookUrl,
    );
    await saveGeneratedCaptions(id, captions);

    return NextResponse.json({ ok: true, captions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Caption generation failed." },
      { status: 500 },
    );
  }
}
