import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env";

/**
 * Uses the secret key, which bypasses row level security. Server only: every caller must check
 * the signed-in user's role and ownership first.
 */
export function createAdminClient() {
  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
