"use server";

import { requireCandidate } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { parseInterests } from "@/lib/talent/recommend-logic";

export async function savePreferencesAction(data: FormData) {
  const profile = await requireCandidate();
  const { error } = await db()
    .from("candidate_preferences")
    .upsert({
      candidate_id: profile.id,
      interests: parseInterests(String(data.get("interests") ?? "")),
      talent_pool_consent: data.get("consent") === "on",
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.error("Saving preferences failed", error);
    return { ok: false as const, error: "Your choices were not saved. Please try again." };
  }
  return { ok: true as const, message: "Your choices are saved." };
}
