import type { CampaignStatus, Platform, SubmissionStatus } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: string) {
  if (!value) return "No deadline";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCurrency(value: number | null) {
  if (value == null) return "Not set";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function statusTone(
  status: CampaignStatus | SubmissionStatus,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "submitted" || status === "paid") return "success";
  if (status === "rejected") return "danger";
  if (status === "ready-to-clip" || status === "checklist-ready") {
    return "warning";
  }

  return "neutral";
}

export function platformHint(platform: Platform) {
  switch (platform) {
    case "YouTube Shorts":
      return "Vertical titles and descriptions with clear CTA language.";
    case "TikTok":
      return "Shorter punchy captions with disclosure at the front.";
    case "Instagram Reels":
      return "Caption-first hooks with concise brand-safe hashtags.";
    default:
      return "Build a reusable cross-platform caption pack.";
  }
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
