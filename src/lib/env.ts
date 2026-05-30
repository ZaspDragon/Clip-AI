export function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-5.5";
  const publicAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "";
  const platformOwnerEmail =
    process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase() ?? "";
  const platformOwnerPassword =
    process.env.PLATFORM_OWNER_PASSWORD?.trim() ?? "";

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    openAiApiKey,
    openAiModel,
    publicAppUrl,
    platformOwnerEmail,
    platformOwnerPassword,
    hasSupabase: Boolean(supabaseUrl && supabaseServiceRoleKey),
    hasSupabaseBrowser: Boolean(supabaseUrl && supabaseAnonKey),
    hasOpenAI: Boolean(openAiApiKey),
  };
}
