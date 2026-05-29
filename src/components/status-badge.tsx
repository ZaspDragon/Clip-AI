import type { CampaignStatus, SubmissionStatus } from "@/lib/types";
import { cn, statusTone } from "@/lib/utils";

const toneClass: Record<ReturnType<typeof statusTone>, string> = {
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  danger: "bg-rose-100 text-rose-800 border-rose-200",
  neutral: "bg-white text-[var(--ink-soft)] border-[var(--line)]",
};

export function StatusBadge({
  status,
}: {
  status: CampaignStatus | SubmissionStatus;
}) {
  const label = status.replace(/-/g, " ");
  const tone = statusTone(status);

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize",
        toneClass[tone],
      )}
    >
      {label}
    </span>
  );
}
