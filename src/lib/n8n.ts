import { getEnv } from "@/lib/env";
import type {
  Campaign,
  GeneratedCaptions,
  RequirementAnalysis,
} from "@/lib/types";

type N8nEvent = "requirements.extract" | "captions.generate";
type ExtendedN8nEvent = N8nEvent | "campaign.process";

export async function callN8nWebhook(
  event: ExtendedN8nEvent,
  webhookUrl: string,
  campaign: Campaign,
): Promise<
  | {
      extraction?: RequirementAnalysis;
      captions?: GeneratedCaptions;
    }
  | null
> {
  if (!webhookUrl.trim()) {
    return null;
  }

  const env = getEnv();
  const callbackUrl = env.publicAppUrl
    ? `${env.publicAppUrl.replace(/\/$/, "")}/api/n8n/callback`
    : "";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event,
      callbackUrl,
      campaign,
      requestedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook returned ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as
    | {
        extraction?: RequirementAnalysis;
        captions?: GeneratedCaptions;
      }
    | null;
}
