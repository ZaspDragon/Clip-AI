import { NextResponse } from "next/server";

import { updateCampaignStatus } from "@/lib/repository";
import type { CampaignStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: CampaignStatus };

    if (!body.status) {
      return NextResponse.json({ error: "Status is required." }, { status: 400 });
    }

    await updateCampaignStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update campaign status.",
      },
      { status: 500 },
    );
  }
}
