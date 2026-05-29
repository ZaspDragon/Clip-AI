import { NextResponse } from "next/server";

import { createClip, listClips } from "@/lib/repository";
import type { ClipInput } from "@/lib/types";

export async function GET() {
  const clips = await listClips();
  return NextResponse.json(clips);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ClipInput>;

    if (!body.campaignId || !body.clipTitle || !body.platform) {
      return NextResponse.json(
        { error: "Campaign, clip title, and platform are required." },
        { status: 400 },
      );
    }

    const clip = await createClip({
      campaignId: body.campaignId,
      clipTitle: body.clipTitle,
      platform: body.platform,
      caption: body.caption ?? "",
      opusClipStatus: body.opusClipStatus ?? "not-started",
      videoFileStatus: body.videoFileStatus ?? "not-started",
      postedUrl: body.postedUrl ?? "",
      views: body.views ?? 0,
      whopSubmissionStatus: body.whopSubmissionStatus ?? "not-started",
    });

    return NextResponse.json(clip, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create clip." },
      { status: 500 },
    );
  }
}
