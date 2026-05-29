import type {
  Campaign,
  CaptionOption,
  GeneratedCaptions,
  RequirementAnalysis,
} from "@/lib/types";

function extractHashtags(input: string) {
  const matches = input.match(/#[A-Za-z0-9_]+/g);
  return matches ?? [];
}

function hasDisclosure(text: string, requiredDisclosure: string) {
  if (!requiredDisclosure.trim()) {
    return true;
  }

  const normalizedCaption = text.toLowerCase();
  const normalizedDisclosure = requiredDisclosure.toLowerCase().trim();

  if (normalizedCaption.includes(normalizedDisclosure)) {
    return true;
  }

  return normalizedDisclosure
    .split(/[,\s/]+/)
    .filter(Boolean)
    .some((token) => normalizedCaption.includes(token));
}

function forbidsExtraHashtags(analysis: RequirementAnalysis) {
  return [...analysis.assetRules, ...analysis.platformRules, ...analysis.finalChecklist]
    .join(" ")
    .toLowerCase()
    .match(/no extra hashtags|no additional hashtags|only use required hashtags/);
}

function inspectCaption(
  text: string,
  platform: string,
  analysis: RequirementAnalysis | null,
) {
  if (!analysis) {
    return { risky: false } as const;
  }

  if (!hasDisclosure(text, analysis.requiredDisclosure)) {
    return {
      risky: true,
      reason: `Missing required disclosure (${analysis.requiredDisclosure}).`,
      platform,
    } as const;
  }

  const hashtags = extractHashtags(text).map((tag) => tag.toLowerCase());
  const banned = analysis.bannedHashtags.find((tag) =>
    hashtags.includes(tag.toLowerCase()),
  );

  if (banned) {
    return {
      risky: true,
      reason: `Uses banned hashtag ${banned}.`,
      platform,
    } as const;
  }

  if (forbidsExtraHashtags(analysis)) {
    const allowed = new Set(analysis.requiredTags.map((tag) => tag.toLowerCase()));
    const extra = hashtags.find((tag) => !allowed.has(tag));

    if (extra) {
      return {
        risky: true,
        reason: `Includes unapproved hashtag ${extra}.`,
        platform,
      } as const;
    }
  }

  return { risky: false } as const;
}

function annotateList(
  items: string[],
  platform: string,
  analysis: RequirementAnalysis | null,
  riskyCaptions: GeneratedCaptions["riskyCaptions"],
) {
  return items.map<CaptionOption>((text) => {
    const result = inspectCaption(text, platform, analysis);

    if (result.risky) {
      riskyCaptions.push({
        platform,
        caption: text,
        reason: result.reason,
      });
    }

    return {
      text,
      risky: result.risky,
      reason: result.risky ? result.reason : undefined,
    };
  });
}

export function annotateGeneratedCaptions(
  campaign: Campaign,
  raw: {
    youtubeShortTitles: string[];
    youtubeDescriptions: string[];
    tiktokCaptions: string[];
    instagramCaptions: string[];
    complianceNotes: string[];
  },
): GeneratedCaptions {
  const riskyCaptions: GeneratedCaptions["riskyCaptions"] = [];

  return {
    youtubeShortTitles: annotateList(
      raw.youtubeShortTitles,
      "YouTube Shorts title",
      campaign.aiAnalysis,
      riskyCaptions,
    ),
    youtubeDescriptions: annotateList(
      raw.youtubeDescriptions,
      "YouTube description",
      campaign.aiAnalysis,
      riskyCaptions,
    ),
    tiktokCaptions: annotateList(
      raw.tiktokCaptions,
      "TikTok caption",
      campaign.aiAnalysis,
      riskyCaptions,
    ),
    instagramCaptions: annotateList(
      raw.instagramCaptions,
      "Instagram caption",
      campaign.aiAnalysis,
      riskyCaptions,
    ),
    riskyCaptions,
    complianceNotes: raw.complianceNotes,
    generatedAt: new Date().toISOString(),
  };
}
