export const PLATFORMS = [
  "YouTube Shorts",
  "TikTok",
  "Instagram Reels",
  "Cross-platform",
] as const;

export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "ready-to-clip",
  "posted",
  "submitted",
  "paid",
  "rejected",
] as const;

export const OPUS_CLIP_STATUSES = [
  "not-started",
  "queued",
  "processing",
  "completed",
] as const;

export const VIDEO_FILE_STATUSES = [
  "not-started",
  "editing",
  "ready",
  "posted",
] as const;

export const SUBMISSION_STATUSES = [
  "not-started",
  "checklist-ready",
  "submitted",
  "rejected",
] as const;

export type Platform = (typeof PLATFORMS)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type OpusClipStatus = (typeof OPUS_CLIP_STATUSES)[number];
export type VideoFileStatus = (typeof VIDEO_FILE_STATUSES)[number];
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export type RequirementAnalysis = {
  requiredTags: string[];
  requiredDisclosure: string;
  bannedHashtags: string[];
  assetRules: string[];
  platformRules: string[];
  rejectionRisks: string[];
  finalChecklist: string[];
  summary: string;
};

export type CaptionOption = {
  text: string;
  risky: boolean;
  reason?: string;
};

export type GeneratedCaptions = {
  youtubeShortTitles: CaptionOption[];
  youtubeDescriptions: CaptionOption[];
  tiktokCaptions: CaptionOption[];
  instagramCaptions: CaptionOption[];
  riskyCaptions: Array<{
    platform: string;
    caption: string;
    reason: string;
  }>;
  complianceNotes: string[];
  generatedAt: string;
};

export type Campaign = {
  id: string;
  name: string;
  whopSectionLink: string;
  whopCampaignUrl: string;
  requirementsText: string;
  officialAssetLink: string;
  platform: Platform;
  deadline: string;
  status: CampaignStatus;
  expectedPayout: number | null;
  aiAnalysis: RequirementAnalysis | null;
  generatedCaptions: GeneratedCaptions | null;
  createdAt: string;
  updatedAt: string;
};

export type Clip = {
  id: string;
  campaignId: string;
  clipTitle: string;
  platform: Platform;
  caption: string;
  opusClipStatus: OpusClipStatus;
  videoFileStatus: VideoFileStatus;
  postedUrl: string;
  views: number;
  whopSubmissionStatus: SubmissionStatus;
  whopSubmissionLink: string;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  n8nWebhookUrl: string;
  defaultDisclosure: string;
  updatedAt: string;
};

export type AppStore = {
  campaigns: Campaign[];
  clips: Clip[];
  settings: AppSettings;
};

export type CampaignInput = {
  name: string;
  whopSectionLink: string;
  whopCampaignUrl: string;
  requirementsText: string;
  officialAssetLink: string;
  platform: Platform;
  deadline: string;
  status: CampaignStatus;
  expectedPayout: number | null;
};

export type ClipInput = {
  campaignId: string;
  clipTitle: string;
  platform: Platform;
  caption: string;
  opusClipStatus: OpusClipStatus;
  videoFileStatus: VideoFileStatus;
  postedUrl?: string;
  views?: number;
  whopSubmissionStatus?: SubmissionStatus;
};

export type SubmissionPrepInput = {
  clipId: string;
  postedUrl: string;
  whopSubmissionLink: string;
  views: number;
  markSubmitted: boolean;
};

export type N8nCallbackPayload = {
  campaignId: string;
  extraction?: RequirementAnalysis;
  captions?: GeneratedCaptions;
};
