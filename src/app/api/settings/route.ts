import { NextResponse } from "next/server";

import { getSettings, saveSettings } from "@/lib/repository";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      n8nWebhookUrl?: string;
      defaultDisclosure?: string;
    };

    const settings = await saveSettings({
      n8nWebhookUrl: body.n8nWebhookUrl ?? "",
      defaultDisclosure: body.defaultDisclosure?.trim() || "#ad",
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save settings." },
      { status: 500 },
    );
  }
}
