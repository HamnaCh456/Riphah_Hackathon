import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

import { recommendJobs } from "./recommend";

export const RECOMMENDATIONS_TAG = "recommendations";
export const recommendationsTagFor = (candidateId: string) => `${RECOMMENDATIONS_TAG}:${candidateId}`;

const FIVE_MINUTES = 300;

/**
 * Recommendations call the embeddings API, so they are slow and cost money on every page view.
 * Failures aren't stored. Changing a resume, applying or changing a job clears the stored result.
 */
export function cachedRecommendations(candidateId: string, interests: string[]) {
  return unstable_cache(
    () => recommendJobs(db(), candidateId, interests),
    ["recommendations", candidateId, interests.join("|")],
    { revalidate: FIVE_MINUTES, tags: [RECOMMENDATIONS_TAG, recommendationsTagFor(candidateId)] },
  )();
}
