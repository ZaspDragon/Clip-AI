import { NextResponse } from "next/server";

import { applyN8nCallback } from "@/lib/repository";
import type { N8nCallbackPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as N8nCallbackPayload;

    if (!payload.campaignId) {
      return NextResponse.json(
        { error: "campaignId is required." },
        { status: 400 },
      );
    }

    await applyN8nCallback(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "n8n callback failed." },
      { status: 500 },
    );
  }
}
