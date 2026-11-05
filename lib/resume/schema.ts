import { z } from "zod";

import { excerptAppearsIn } from "@/lib/ai/verify-excerpt";

/**
 * There are deliberately no fields for age, gender, religion, nationality, marital status or
 * photos: what isn't extracted can't affect a score later.
 */

const text = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer`);

/** Where an item came from. Only the server sets this. */
const provenance = {
  id: z.string(),
  excerpt: z.string().nullable(),
  verified: z.boolean(),
  source: z.enum(["resume", "candidate"]),
  edited: z.boolean(),
};

const experienceSchema = z.object({
  ...provenance,
  title: text(200),
  company: text(200),
  dates: text(100),
  summary: text(3000),
});

const projectSchema = z.object({
  ...provenance,
  name: text(200),
  description: text(3000),
  technologies: text(500),
});

const educationSchema = z.object({
  ...provenance,
  institution: text(200),
  degree: text(200),
  dates: text(100),
});

export const CONTACT_FIELDS = ["name", "email", "phone", "location", "links"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export const resumeDataSchema = z.object({
  name: text(120),
  email: text(200),
  phone: text(60),
  location: text(200),
  links: text(500),
  /** Contact details the AI returned that aren't in the resume text. */
  unverifiedContact: z.array(z.enum(CONTACT_FIELDS)),
  experience: z.array(experienceSchema).max(50),
  projects: z.array(projectSchema).max(50),
  education: z.array(educationSchema).max(30),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;
export type ExperienceItem = z.infer<typeof experienceSchema>;
export type ProjectItem = z.infer<typeof projectSchema>;
export type EducationItem = z.infer<typeof educationSchema>;

const SECTIONS = ["experience", "projects", "education"] as const;
type SectionItem = ExperienceItem | ProjectItem | EducationItem;

const PROVENANCE_KEYS = ["id", "excerpt", "verified", "source", "edited"];

function contentOf(item: SectionItem): string {
  return JSON.stringify(
    Object.entries(item).filter(([key]) => !PROVENANCE_KEYS.includes(key)),
  );
}

/**
 * Merges what the candidate sent with what the AI first extracted. Provenance is worked out here
 * and never taken from the browser, so nobody can make an added claim look like resume evidence.
 */
export function applyCorrections(
  submitted: ResumeData,
  extracted: ResumeData,
  rawText: string,
): ResumeData {
  const merged: ResumeData = {
    ...submitted,
    unverifiedContact: extracted.unverifiedContact.filter(
      (field) => submitted[field] === extracted[field] && submitted[field] !== "",
    ),
    experience: [],
    projects: [],
    education: [],
  };

  for (const section of SECTIONS) {
    const originals = new Map<string, SectionItem>(
      extracted[section].map((item) => [item.id, item]),
    );
    (merged[section] as SectionItem[]) = (submitted[section] as SectionItem[]).map((item) => {
      const original = originals.get(item.id);
      if (!original) {
        return { ...item, excerpt: null, verified: false, source: "candidate", edited: false };
      }
      return {
        ...item,
        excerpt: original.excerpt,
        verified: excerptAppearsIn(original.excerpt, rawText),
        source: "resume",
        edited: contentOf(item) !== contentOf(original),
      };
    });
  }

  return merged;
}
