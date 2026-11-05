"use server";

import { z } from "zod";

import { requireRecruiter } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { RankedCandidate } from "@/lib/talent/rank";
import { searchTalent } from "@/lib/talent/search";

export type TalentResult =
  | { ok: true; results: RankedCandidate[] }
  | { ok: false; message: string };

export async function searchAction(query: string): Promise<TalentResult> {
  const profile = await requireRecruiter();
  const parsed = z.string().trim().min(3).max(300).safeParse(query);
  if (!parsed.success) {
    return { ok: false, message: "Enter 3 to 300 characters to search." };
  }
  try {
    const { results } = await searchTalent(db(), profile.id, parsed.data);
    return { ok: true, results };
  } catch (error) {
    console.error("Talent search failed", error);
    return {
      ok: false,
      message: "The search could not finish. Please try again.",
    };
  }
}
