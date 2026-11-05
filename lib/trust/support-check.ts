import type { AssessedRequirement } from "@/lib/matching/types";

export type SupportVerdict = { supported: boolean; reason: string };
export type SupportJudge = (
  pairs: { claim: string; quotes: string[] }[],
) => Promise<SupportVerdict[]>;
export type CheckedRequirement = AssessedRequirement & { reviewReason: string | null };

const CHECK_FAILED = "This claim could not be double-checked automatically.";

/**
 * Only flags for a person. It never changes a status or score, because the recruiter decides
 * through the existing override control. An AI failure flags claims and never approves them.
 */
export async function checkSupport(
  items: AssessedRequirement[],
  judge: SupportJudge,
): Promise<CheckedRequirement[]> {
  const output: CheckedRequirement[] = items.map((item) => ({ ...item, reviewReason: null }));
  const toCheck = output.filter(
    (item) => item.status !== "no_evidence" && item.evidence.some((e) => e.verified),
  );
  if (toCheck.length === 0) return output;

  let verdicts: SupportVerdict[] | null = null;
  try {
    verdicts = await judge(
      toCheck.map((item) => ({
        claim: `${item.status === "confirmed_absent" ? "Does not have" : "Has"}: ${item.label}`,
        quotes: item.evidence.filter((e) => e.verified).map((e) => e.quote),
      })),
    );
  } catch (error) {
    console.error("Support check failed", error);
  }

  toCheck.forEach((item, i) => {
    const verdict = verdicts?.length === toCheck.length ? verdicts[i] : null;
    if (!verdict) {
      item.needsReview = true;
      item.reviewReason = CHECK_FAILED;
    } else if (!verdict.supported) {
      item.needsReview = true;
      item.reviewReason = verdict.reason;
    }
  });
  return output;
}
