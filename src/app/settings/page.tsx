import { PageShell } from "@/components/page-shell";
import { SettingsPanel } from "@/components/settings-panel";
import { getEnv } from "@/lib/env";
import { getSettings } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, env] = await Promise.all([getSettings(), Promise.resolve(getEnv())]);

  return (
    <PageShell
      eyebrow="Settings"
      title="Wire up OpenAI, Supabase, and n8n"
      description="The app runs in demo mode out of the box, then upgrades to Supabase persistence and live OpenAI generation when your environment variables are present."
    >
      <SettingsPanel
        initialSettings={settings}
        runtime={{ hasOpenAI: env.hasOpenAI, hasSupabase: env.hasSupabase }}
      />
    </PageShell>
  );
}
