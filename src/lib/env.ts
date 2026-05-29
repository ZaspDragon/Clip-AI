export function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-5.5";
  const publicAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "";

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    openAiApiKey,
    openAiModel,
    publicAppUrl,
    hasSupabase: Boolean(supabaseUrl && supabaseServiceRoleKey),
    hasOpenAI: Boolean(openAiApiKey),
  };
}
