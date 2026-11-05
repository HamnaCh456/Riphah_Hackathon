import { normalizeSkill } from "@/lib/skills/normalize";
import { cosineSimilarity } from "@/lib/trust/cosine";

const MIN_SKILL_SIMILARITY = 0.8;

export function buildProfileText(
  skills: string[],
  interests: string[],
  projects: string[],
): string {
  return [
    `Skills: ${skills.join(", ")}`,
    interests.length ? `Interests: ${interests.join(", ")}` : "",
    ...projects,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Which job requirements one of the candidate's verified skills meets, by name or by meaning. */
export function matchSkills(
  labels: string[],
  labelVectors: number[][],
  skills: string[],
  skillVectors: number[][],
): Set<string> {
  const names = new Set(skills.map(normalizeSkill));
  return new Set(
    labels.filter(
      (label, i) =>
        names.has(normalizeSkill(label)) ||
        skillVectors.some(
          (vector) => cosineSimilarity(vector, labelVectors[i]) >= MIN_SKILL_SIMILARITY,
        ),
    ),
  );
}

export function parseInterests(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 10);
}

type Internal = {
  jobId: string;
  title: string;
  description: string;
  similarity: number;
  matchedSkills: string[];
  otherRequirements: string[];
};

export type PublicRecommendation = Omit<Internal, "similarity">;

export function toPublicRecommendation({
  jobId,
  title,
  description,
  matchedSkills,
  otherRequirements,
}: Internal): PublicRecommendation {
  return { jobId, title, description, matchedSkills, otherRequirements };
}
