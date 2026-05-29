import { NextResponse } from "next/server";

import { createCampaign, listCampaigns } from "@/lib/repository";
import type { CampaignInput } from "@/lib/types";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CampaignInput>;

    if (!body.name || !body.requirementsText || !body.deadline || !body.platform) {
      return NextResponse.json(
        { error: "Name, requirements, platform, and deadline are required." },
        { status: 400 },
      );
    }

    const campaign = await createCampaign({
      name: body.name,
      whopSectionLink: body.whopSectionLink ?? "",
      whopCampaignUrl: body.whopCampaignUrl ?? "",
      requirementsText: body.requirementsText,
      officialAssetLink: body.officialAssetLink ?? "",
      platform: body.platform,
      deadline: body.deadline,
      status: body.status ?? "active",
      expectedPayout:
        body.expectedPayout == null || Number.isNaN(body.expectedPayout)
          ? null
          : Number(body.expectedPayout),
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create campaign." },
      { status: 500 },
    );
  }
}
