import { NextResponse } from "next/server";

import { updateSubmissionPrep } from "@/lib/repository";
import type { SubmissionPrepInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<SubmissionPrepInput>;

    await updateSubmissionPrep({
      clipId: id,
      postedUrl: body.postedUrl ?? "",
      whopSubmissionLink: body.whopSubmissionLink ?? "",
      views: body.views ?? 0,
      markSubmitted: Boolean(body.markSubmitted),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save submission prep.",
      },
      { status: 500 },
    );
  }
}
