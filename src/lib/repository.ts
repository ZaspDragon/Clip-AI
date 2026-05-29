import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { defaultStore } from "@/lib/seed";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  AppSettings,
  AppStore,
  Campaign,
  CampaignInput,
  Clip,
  ClipInput,
  GeneratedCaptions,
  N8nCallbackPayload,
  RequirementAnalysis,
  SubmissionPrepInput,
} from "@/lib/types";

const DEMO_DB_PATH = path.join(process.cwd(), "data", "demo-db.json");

function nowIso() {
  return new Date().toISOString();
}

async function ensureDemoStore() {
  try {
    await fs.access(DEMO_DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DEMO_DB_PATH), { recursive: true });
    await fs.writeFile(
      DEMO_DB_PATH,
      JSON.stringify(defaultStore, null, 2),
      "utf8",
    );
  }
}

async function readDemoStore() {
  await ensureDemoStore();
  const file = await fs.readFile(DEMO_DB_PATH, "utf8");
  return JSON.parse(file) as AppStore;
}

async function writeDemoStore(store: AppStore) {
  await fs.writeFile(DEMO_DB_PATH, JSON.stringify(store, null, 2), "utf8");
}

function mapCampaignRow(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    whopSectionLink: String(row.whop_section_link ?? ""),
    whopCampaignUrl: String(row.whop_campaign_url ?? ""),
    requirementsText: String(row.requirements_text ?? ""),
    officialAssetLink: String(row.official_asset_link ?? ""),
    platform: String(row.platform ?? "Cross-platform") as Campaign["platform"],
    deadline: String(row.deadline ?? ""),
    status: String(row.status ?? "draft") as Campaign["status"],
    expectedPayout:
      row.expected_payout == null ? null : Number(row.expected_payout),
    aiAnalysis: (row.ai_analysis as RequirementAnalysis | null) ?? null,
    generatedCaptions: (row.generated_captions as GeneratedCaptions | null) ?? null,
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function mapClipRow(row: Record<string, unknown>): Clip {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id ?? ""),
    clipTitle: String(row.clip_title ?? row.clip_idea ?? ""),
    platform: String(row.platform ?? "Cross-platform") as Clip["platform"],
    caption: String(row.caption ?? ""),
    opusClipStatus: String(row.opus_clip_status ?? "not-started") as Clip["opusClipStatus"],
    videoFileStatus: String(row.video_file_status ?? "not-started") as Clip["videoFileStatus"],
    postedUrl: String(row.posted_url ?? ""),
    views: Number(row.views ?? 0),
    whopSubmissionStatus: String(row.submission_status ?? "not-started") as Clip["whopSubmissionStatus"],
    whopSubmissionLink: String(row.whop_submission_link ?? ""),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function campaignPayload(input: CampaignInput) {
  return {
    name: input.name.trim(),
    whop_section_link: input.whopSectionLink.trim(),
    whop_campaign_url: input.whopCampaignUrl.trim(),
    requirements_text: input.requirementsText.trim(),
    official_asset_link: input.officialAssetLink.trim(),
    platform: input.platform,
    deadline: input.deadline,
    status: input.status,
    expected_payout: input.expectedPayout,
  };
}

export async function listCampaigns() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return (await readDemoStore()).campaigns.sort((a, b) =>
      a.deadline.localeCompare(b.deadline),
    );
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("deadline", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapCampaignRow(row));
}

export async function getCampaign(id: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return (await readDemoStore()).campaigns.find((campaign) => campaign.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data ? mapCampaignRow(data) : null;
}

export async function createCampaign(input: CampaignInput) {
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (!supabase) {
    const store = await readDemoStore();
    const campaign: Campaign = {
      id: randomUUID(),
      ...input,
      aiAnalysis: null,
      generatedCaptions: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    store.campaigns.unshift(campaign);
    await writeDemoStore(store);
    return campaign;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert(campaignPayload(input))
    .select("*")
    .single();

  if (error) throw error;
  return mapCampaignRow(data);
}

export async function updateCampaignStatus(
  campaignId: string,
  status: Campaign["status"],
) {
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (!supabase) {
    const store = await readDemoStore();
    store.campaigns = store.campaigns.map((campaign) =>
      campaign.id === campaignId
        ? { ...campaign, status, updatedAt: timestamp }
        : campaign,
    );
    await writeDemoStore(store);
    return;
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      status,
      updated_at: timestamp,
    })
    .eq("id", campaignId);

  if (error) throw error;
}

export async function saveRequirementAnalysis(
  campaignId: string,
  analysis: RequirementAnalysis,
) {
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (!supabase) {
    const store = await readDemoStore();
    store.campaigns = store.campaigns.map((campaign) =>
      campaign.id === campaignId
        ? { ...campaign, aiAnalysis: analysis, updatedAt: timestamp }
        : campaign,
    );
    await writeDemoStore(store);
    return;
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      ai_analysis: analysis,
      updated_at: timestamp,
    })
    .eq("id", campaignId);

  if (error) throw error;
}

export async function saveGeneratedCaptions(
  campaignId: string,
  captions: GeneratedCaptions,
) {
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (!supabase) {
    const store = await readDemoStore();
    store.campaigns = store.campaigns.map((campaign) =>
      campaign.id === campaignId
        ? { ...campaign, generatedCaptions: captions, updatedAt: timestamp }
        : campaign,
    );
    await writeDemoStore(store);
    return;
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      generated_captions: captions,
      updated_at: timestamp,
    })
    .eq("id", campaignId);

  if (error) throw error;
}

export async function listClips() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return (await readDemoStore()).clips.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  const { data, error } = await supabase
    .from("clips")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapClipRow(row));
}

export async function createClip(input: ClipInput) {
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();

  if (!supabase) {
    const store = await readDemoStore();
    const clip: Clip = {
      id: randomUUID(),
      campaignId: input.campaignId,
      clipTitle: input.clipTitle.trim(),
      platform: input.platform,
      caption: input.caption.trim(),
      opusClipStatus: input.opusClipStatus,
      videoFileStatus: input.videoFileStatus,
      postedUrl: input.postedUrl?.trim() ?? "",
      views: input.views ?? 0,
      whopSubmissionStatus: input.whopSubmissionStatus ?? "not-started",
      whopSubmissionLink: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    store.clips.unshift(clip);
    await writeDemoStore(store);
    return clip;
  }

  const { data, error } = await supabase
    .from("clips")
    .insert({
      campaign_id: input.campaignId,
      clip_title: input.clipTitle.trim(),
      clip_idea: input.clipTitle.trim(),
      platform: input.platform,
      caption: input.caption.trim(),
      opus_clip_status: input.opusClipStatus,
      video_file_status: input.videoFileStatus,
      posted_url: input.postedUrl?.trim() ?? "",
      views: input.views ?? 0,
      submission_status: input.whopSubmissionStatus ?? "not-started",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapClipRow(data);
}

export async function updateSubmissionPrep(input: SubmissionPrepInput) {
  const supabase = getSupabaseAdmin();
  const timestamp = nowIso();
  const nextStatus = input.markSubmitted ? "submitted" : "checklist-ready";

  if (!supabase) {
    const store = await readDemoStore();
    store.clips = store.clips.map((clip) =>
      clip.id === input.clipId
        ? {
            ...clip,
            postedUrl: input.postedUrl.trim(),
            whopSubmissionLink: input.whopSubmissionLink.trim(),
            views: input.views,
            whopSubmissionStatus: nextStatus,
            videoFileStatus: input.postedUrl.trim() ? "posted" : clip.videoFileStatus,
            updatedAt: timestamp,
          }
        : clip,
    );
    await writeDemoStore(store);
    return;
  }

  const { error } = await supabase
    .from("clips")
    .update({
      posted_url: input.postedUrl.trim(),
      whop_submission_link: input.whopSubmissionLink.trim(),
      views: input.views,
      submission_status: nextStatus,
      video_file_status: input.postedUrl.trim() ? "posted" : undefined,
      updated_at: timestamp,
    })
    .eq("id", input.clipId);

  if (error) throw error;
}

export async function getSettings() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return (await readDemoStore()).settings;
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("key", "global")
    .single();

  if (error && error.code !== "PGRST116") throw error;

  const value = (data?.value as Partial<AppSettings> | undefined) ?? {};

  return {
    n8nWebhookUrl: value.n8nWebhookUrl ?? "",
    defaultDisclosure: value.defaultDisclosure ?? "#ad",
    updatedAt: String(data?.updated_at ?? nowIso()),
  } satisfies AppSettings;
}

export async function saveSettings(input: Omit<AppSettings, "updatedAt">) {
  const supabase = getSupabaseAdmin();
  const settings: AppSettings = {
    ...input,
    updatedAt: nowIso(),
  };

  if (!supabase) {
    const store = await readDemoStore();
    store.settings = settings;
    await writeDemoStore(store);
    return settings;
  }

  const { error } = await supabase.from("app_settings").upsert({
    key: "global",
    value: {
      n8nWebhookUrl: settings.n8nWebhookUrl,
      defaultDisclosure: settings.defaultDisclosure,
    },
    updated_at: settings.updatedAt,
  });

  if (error) throw error;
  return settings;
}

export async function applyN8nCallback(payload: N8nCallbackPayload) {
  if (payload.extraction) {
    await saveRequirementAnalysis(payload.campaignId, payload.extraction);
  }

  if (payload.captions) {
    await saveGeneratedCaptions(payload.campaignId, payload.captions);
  }
}
