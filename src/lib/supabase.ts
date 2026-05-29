import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  const env = getEnv();

  if (!env.hasSupabase) {
    return null;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      env.supabaseUrl,
      env.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseAdmin;
}
