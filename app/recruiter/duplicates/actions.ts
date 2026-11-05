"use server";

import { requireRecruiter } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { orderedPair, parseDecision } from "@/lib/duplicates/decide-logic";
import { loadDuplicates } from "@/lib/duplicates/load";

const NOT_VALID = "This pair is no longer waiting for a decision. Reload the page.";

/** The only caller of merge_candidates, so a recruiter's approval is the only way a merge starts. */
export async function decideDuplicateAction(data: FormData) {
  const profile = await requireRecruiter();
  const first = String(data.get("first") ?? "");
  const second = String(data.get("second") ?? "");
  const admin = db();

  try {
    // Re-checked here, so a crafted request can't act on people outside this recruiter's pairs.
    const { pairs } = await loadDuplicates(admin, profile.id);
    const known = pairs.some((pair) => {
      const ids = [pair.a.candidateId, pair.b.candidateId];
      return ids.includes(first) && ids.includes(second) && first !== second;
    });
    if (!known) return { ok: false as const, error: NOT_VALID };

    const parsed = parseDecision(
      {
        action: data.get("action"),
        keep: data.get("keep"),
        confirmed: data.get("confirmed"),
      },
      [first, second],
    );
    if (!parsed.ok) return { ok: false as const, error: parsed.error };

    if (parsed.decision.action === "dismiss") {
      const [candidate_a, candidate_b] = orderedPair(first, second);
      const { error } = await admin.from("duplicate_decisions").insert({
        candidate_a,
        candidate_b,
        decision: "dismissed",
        decided_by: profile.id,
      });
      if (error) throw error;
      return { ok: true as const, message: "Marked as not a duplicate." };
    }

    const { error } = await admin.rpc("merge_candidates", {
      p_keep: parsed.decision.keep,
      p_other: parsed.decision.other,
      p_recruiter: profile.id,
    });
    if (error) throw error;
    return { ok: true as const, message: "Records linked as one person." };
  } catch (error) {
    console.error("Duplicate decision failed", error);
    return { ok: false as const, error: "That was not saved. Please try again." };
  }
}
