import OpenAI from "openai";

import { annotateGeneratedCaptions } from "@/lib/compliance";
import { getEnv } from "@/lib/env";
import { callN8nWebhook } from "@/lib/n8n";
import type {
  Campaign,
  GeneratedCaptions,
  RequirementAnalysis,
} from "@/lib/types";

let openAiClient: OpenAI | null = null;

function getOpenAIClient() {
  const env = getEnv();

  if (!env.hasOpenAI) {
    return null;
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({
      apiKey: env.openAiApiKey,
    });
  }

  return openAiClient;
}

function normalizeHashtag(tag: string) {
  if (!tag) return "";
  return tag.startsWith("#") ? tag : `#${tag}`;
}

function parseLines(input: string) {
  return input
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function heuristicExtraction(campaign: Campaign): RequirementAnalysis {
  const text = campaign.requirementsText;
  const lines = parseLines(text);
  const allHashtags = Array.from(new Set(text.match(/#[A-Za-z0-9_]+/g) ?? []));
  const lower = text.toLowerCase();

  const requiredTags = lines
    .filter((line) => /required hashtag|required tag/i.test(line))
    .flatMap((line) => line.match(/#[A-Za-z0-9_]+/g) ?? []);

  const bannedHashtags = lines
    .filter((line) => /banned hashtag|do not use|avoid hashtag/i.test(line))
    .flatMap((line) => line.match(/#[A-Za-z0-9_]+/g) ?? []);

  const disclosureLine = lines.find((line) =>
    /disclosure|#ad|sponsored|ftc/i.test(line),
  );

  const requiredDisclosure = disclosureLine?.match(/#[A-Za-z0-9_]+/)?.[0]
    ?? (disclosureLine?.includes("Sponsored") ? "Sponsored" : lower.includes("#ad") ? "#ad" : "");

  const assetRules = lines.filter((line) => /asset|official|logo|b-roll/i.test(line));
  const platformRules = lines.filter((line) =>
    /tiktok|youtube|instagram|caption|description|hook|hashtags/i.test(line),
  );
  const rejectionRisks = lines.filter((line) =>
    /reject|risk|deadline|missing|no extra hashtags/i.test(line),
  );

  const finalChecklist = [
    "Paste the official campaign requirements manually if the Whop page is unavailable.",
    campaign.officialAssetLink
      ? "Use only the linked official asset folder."
      : "Add the official asset link before publishing.",
    requiredDisclosure
      ? `Include the required disclosure: ${requiredDisclosure}.`
      : "Confirm whether FTC disclosure is required before posting.",
    requiredTags.length > 0
      ? `Use only approved tags: ${requiredTags.map(normalizeHashtag).join(", ")}.`
      : "Double-check whether hashtags are required or forbidden.",
    "Review platform-specific limits and rejection risks before submitting.",
  ];

  return {
    requiredTags: (requiredTags.length > 0 ? requiredTags : allHashtags).map(normalizeHashtag),
    requiredDisclosure,
    bannedHashtags: bannedHashtags.map(normalizeHashtag),
    assetRules:
      assetRules.length > 0
        ? assetRules
        : ["Use official brand assets only."],
    platformRules:
      platformRules.length > 0
        ? platformRules
        : ["Follow the campaign platform instructions exactly."],
    rejectionRisks:
      rejectionRisks.length > 0
        ? rejectionRisks
        : ["Missing disclosure, extra hashtags, or unofficial assets may cause rejection."],
    finalChecklist,
    summary:
      "Manual-requirement parse generated from pasted rules. Review before posting.",
  };
}

function heuristicCaptions(campaign: Campaign): GeneratedCaptions {
  const analysis = campaign.aiAnalysis ?? heuristicExtraction(campaign);
  const disclosure = analysis.requiredDisclosure
    ? `${analysis.requiredDisclosure} `
    : "";
  const tagBlock =
    analysis.requiredTags.length > 0 ? ` ${analysis.requiredTags.join(" ")}` : "";
  const hook = campaign.name.replace(/deal|campaign/gi, "").trim();

  return annotateGeneratedCaptions(campaign, {
    youtubeShortTitles: [
      `${hook}: the creator workflow update I would actually reuse`,
      `I tested this ${campaign.platform} content angle before the deadline`,
      `The clip workflow that made this sponsor brief much easier`,
    ],
    youtubeDescriptions: [
      `${disclosure}Using only the official assets for ${campaign.name} and keeping the message clean for creators.${tagBlock}`.trim(),
      `${disclosure}Built this post around the approved campaign checklist and asset pack.${tagBlock}`.trim(),
    ],
    tiktokCaptions: [
      `${disclosure}Turning this sponsor brief into a clean clip workflow without breaking the rules.${tagBlock}`.trim(),
      `${disclosure}Quick creator hook, official assets only, and no fluff claims.${tagBlock}`.trim(),
    ],
    instagramCaptions: [
      `${disclosure}Clean edit, official assets, and a deadline-ready caption pack for ${campaign.name}.${tagBlock}`.trim(),
      `${disclosure}Keeping this one sponsor-safe from hook to CTA with the approved asset pack.${tagBlock}`.trim(),
    ],
    complianceNotes: [
      "Risk scan checks disclosure and hashtag usage automatically.",
      "Review any platform-specific asset or CTA rules before posting.",
    ],
  });
}

async function callOpenAIForExtraction(campaign: Campaign) {
  const client = getOpenAIClient();
  const env = getEnv();

  if (!client || !env.hasOpenAI) {
    return heuristicExtraction(campaign);
  }

  const response = await client.responses.create({
    model: env.openAiModel,
    reasoning: { effort: "minimal" },
    temperature: 0.2,
    input: [
      {
        role: "system",
        content:
          "You extract creator campaign compliance requirements. Be conservative, do not invent allowances, and call out FTC disclosure or asset issues clearly.",
      },
      {
        role: "user",
        content: `Campaign name: ${campaign.name}
Platform: ${campaign.platform}
Whop section link: ${campaign.whopSectionLink}
Whop campaign URL: ${campaign.whopCampaignUrl}
Official asset link: ${campaign.officialAssetLink || "Missing"}
Requirements text:
${campaign.requirementsText}

Rules:
- Do not assume Whop scraping is available.
- Treat the pasted requirements as the primary source of truth.
- Always call out that only official assets are allowed.
- If disclosure is required, return it exactly and highlight it.`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "clipflow_requirements",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            requiredTags: {
              type: "array",
              items: { type: "string" },
            },
            requiredDisclosure: { type: "string" },
            bannedHashtags: {
              type: "array",
              items: { type: "string" },
            },
            assetRules: {
              type: "array",
              items: { type: "string" },
            },
            platformRules: {
              type: "array",
              items: { type: "string" },
            },
            rejectionRisks: {
              type: "array",
              items: { type: "string" },
            },
            finalChecklist: {
              type: "array",
              items: { type: "string" },
            },
            summary: { type: "string" },
          },
          required: [
            "requiredTags",
            "requiredDisclosure",
            "bannedHashtags",
            "assetRules",
            "platformRules",
            "rejectionRisks",
            "finalChecklist",
            "summary",
          ],
        },
      },
      verbosity: "low",
    },
  });

  return JSON.parse(response.output_text) as RequirementAnalysis;
}

async function callOpenAIForCaptions(campaign: Campaign) {
  const client = getOpenAIClient();
  const env = getEnv();

  if (!client || !env.hasOpenAI) {
    return heuristicCaptions(campaign);
  }

  const analysis = campaign.aiAnalysis ?? heuristicExtraction(campaign);

  const response = await client.responses.create({
    model: env.openAiModel,
    reasoning: { effort: "minimal" },
    temperature: 0.7,
    input: [
      {
        role: "system",
        content:
          "You generate creator captions that obey campaign compliance rules. Keep the copy punchy and practical. Never add unapproved hashtags or skip required disclosures.",
      },
      {
        role: "user",
        content: `Campaign name: ${campaign.name}
Platform: ${campaign.platform}
Requirements summary: ${analysis.summary}
Required tags: ${analysis.requiredTags.join(", ") || "None provided"}
Required disclosure: ${analysis.requiredDisclosure || "None provided"}
Banned hashtags: ${analysis.bannedHashtags.join(", ") || "None provided"}
Asset rules: ${analysis.assetRules.join(" | ")}
Platform rules: ${analysis.platformRules.join(" | ")}
Rejection risks: ${analysis.rejectionRisks.join(" | ")}

Return concise, usable caption options. If disclosure is required, include it inside every platform caption output.`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "clipflow_captions",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            youtubeShortTitles: {
              type: "array",
              items: { type: "string" },
            },
            youtubeDescriptions: {
              type: "array",
              items: { type: "string" },
            },
            tiktokCaptions: {
              type: "array",
              items: { type: "string" },
            },
            instagramCaptions: {
              type: "array",
              items: { type: "string" },
            },
            complianceNotes: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "youtubeShortTitles",
            "youtubeDescriptions",
            "tiktokCaptions",
            "instagramCaptions",
            "complianceNotes",
          ],
        },
      },
      verbosity: "low",
    },
  });

  return annotateGeneratedCaptions(
    campaign,
    JSON.parse(response.output_text) as {
      youtubeShortTitles: string[];
      youtubeDescriptions: string[];
      tiktokCaptions: string[];
      instagramCaptions: string[];
      complianceNotes: string[];
    },
  );
}

export async function extractCampaignRequirements(
  campaign: Campaign,
  webhookUrl: string,
) {
  try {
    const n8nResult = await callN8nWebhook(
      "requirements.extract",
      webhookUrl,
      campaign,
    );

    if (n8nResult?.extraction) {
      return n8nResult.extraction;
    }
  } catch {
    // Fall back to direct OpenAI extraction if the webhook is unavailable.
  }

  try {
    return await callOpenAIForExtraction(campaign);
  } catch {
    return heuristicExtraction(campaign);
  }
}

export async function generateCampaignCaptions(
  campaign: Campaign,
  webhookUrl: string,
) {
  try {
    const n8nResult = await callN8nWebhook(
      "captions.generate",
      webhookUrl,
      campaign,
    );

    if (n8nResult?.captions) {
      return n8nResult.captions;
    }
  } catch {
    // Fall back to direct OpenAI generation if the webhook is unavailable.
  }

  try {
    return await callOpenAIForCaptions(campaign);
  } catch {
    return heuristicCaptions(campaign);
  }
}

export async function processCampaignWithAI(
  campaign: Campaign,
  webhookUrl: string,
) {
  try {
    const n8nResult = await callN8nWebhook(
      "campaign.process",
      webhookUrl,
      campaign,
    );

    if (n8nResult?.extraction || n8nResult?.captions) {
      const extraction = n8nResult.extraction ?? heuristicExtraction(campaign);
      const hydratedCampaign = { ...campaign, aiAnalysis: extraction };

      return {
        extraction,
        captions:
          n8nResult.captions ?? heuristicCaptions(hydratedCampaign),
      };
    }
  } catch {
    // Fall through to local processing.
  }

  const extraction = await extractCampaignRequirements(campaign, "");
  const hydratedCampaign = { ...campaign, aiAnalysis: extraction };
  const captions = await generateCampaignCaptions(hydratedCampaign, "");

  return { extraction, captions };
}
