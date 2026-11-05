import "server-only";

import { loadApplication } from "@/lib/matching/read";

import { buildComparison, type ComparisonApplicant } from "./build-comparison";

export type LoadResult =
  | { ok: true; comparison: ReturnType<typeof buildComparison> }
  | { ok: false; message: string };

export function parseSelection(raw: string | string[] | undefined): string[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return [...new Set(list)];
}

export async function loadComparison(
  jobId: string,
  recruiterId: string,
  applicationIds: string[],
): Promise<LoadResult> {
  if (applicationIds.length < 2 || applicationIds.length > 4) {
    return { ok: false, message: "Choose 2 to 4 applicants to compare." };
  }
  // loadApplication returns null unless this recruiter owns the application's job.
  const loaded = await Promise.all(
    applicationIds.map((id) => loadApplication(id, recruiterId)),
  );

  const applicants: ComparisonApplicant[] = [];
  for (const [i, item] of loaded.entries()) {
    if (!item || item.owned.jobId !== jobId) {
      return { ok: false, message: "One of these applicants was not found for this job." };
    }
    if (!item.result) {
      return {
        ok: false,
        message: `${item.owned.candidateName} has no AI assessment yet, so they can't be compared.`,
      };
    }
    applicants.push({
      applicationId: applicationIds[i],
      name: item.owned.candidateName,
      score: item.result.score,
      ceiling: item.result.ceiling,
      summary: item.summary ?? "",
      requirements: item.result.requirements,
    });
  }
  return { ok: true, comparison: buildComparison(applicants) };
}
