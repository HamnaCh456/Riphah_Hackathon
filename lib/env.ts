import "server-only";

/**
 * Reads the underscore names (the only form Vercel accepts), then the hyphenated names in the
 * local .env file. The values are read on use, so a missing key fails the request that needs it
 * and not the whole build.
 */
function read(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing environment variable: ${names[0]}`);
}

export const serverEnv = {
  get supabaseUrl() {
    return read("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE-URL");
  },
  get supabasePublishableKey() {
    return read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseSecretKey() {
    return read("SUPABASE_SECRET_KEY", "ANON_API_KEY", "ANON-API-KEY");
  },
  get geminiKey() {
    return read("GEMINI_API_KEY", "GEMINI-API-KEY");
  },
  get openaiKey() {
    return read("OPENAI_API_KEY", "OPENAI-API-KEY");
  },
};
