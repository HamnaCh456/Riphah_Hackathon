import "server-only";

import { embedTexts, generateJson } from "@/lib/ai/gemini";
import { chunkResume } from "@/lib/matching/chunk";
import {
  ASSESSMENT_SYSTEM_PROMPT,
  assessmentOutput,
  assessmentResponseSchema,
  buildPrompt,
} from "@/lib/matching/prompt";
import { sectionsFor, TOP_K } from "@/lib/matching/run";
import { computeScore } from "@/lib/matching/score";
import type { Requirement } from "@/lib/matching/types";
import { normalizeForMatch, verifyRequirement } from "@/lib/matching/verify";

import { cosineSimilarity } from "./cosine";

/**
 * Same chunking, prompt, verification and scoring as a real assessment, on text in memory.
 * Nothing is saved, so a fairness check can't change a real score or application.
 */
export async function scoreRedactedText(
  jobTitle: string,
  requirements: Requirement[],
  redactedText: string,
): Promise<number> {
  const raw = chunkResume(redactedText).filter((c) => c.content.trim());
  if (raw.length === 0) throw new Error("This resume has no text to score.");
  const [chunkVectors, requirementVectors] = await Promise.all([
    embedTexts(raw.map((c) => c.content), "RETRIEVAL_DOCUMENT"),
    embedTexts(
      requirements.map((r) => `${r.label} (${jobTitle})`),
      "RETRIEVAL_QUERY",
    ),
  ]);

  const items = requirements.map((requirement, i) => {
    const allowed = sectionsFor(requirement);
    const term = normalizeForMatch(requirement.label);
    const ranked = raw
      .map((c, index) => ({
        id: `chunk-${c.ordinal}`,
        section: c.section,
        content: c.content,
        similarity: cosineSimilarity(chunkVectors[index], requirementVectors[i]),
      }))
      .filter((c) => allowed.includes(c.section))
      .sort((a, b) => b.similarity - a.similarity);
    // Like the real pipeline, literal mentions are always included.
    const literal = ranked
      .slice(TOP_K)
      .filter((c) => normalizeForMatch(c.content).includes(term));
    return { requirement, chunks: [...ranked.slice(0, TOP_K), ...literal] };
  });

  const output = assessmentOutput.parse(
    await generateJson({
      system: ASSESSMENT_SYSTEM_PROMPT,
      prompt: buildPrompt(jobTitle, items),
      responseSchema: assessmentResponseSchema,
    }),
  );
  const assessed = items.map(({ requirement, chunks }) =>
    verifyRequirement(
      requirement,
      output.results.find((r) => r.key === requirement.key),
      chunks,
    ),
  );
  return computeScore(assessed).score;
}
