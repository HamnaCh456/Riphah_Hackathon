import { z } from "zod";

import { displaySkill, normalizeSkill } from "@/lib/skills/normalize";

export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
] as const;

export const REQUIREMENT_KINDS = ["skill", "experience", "qualification"] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer`)
    .transform((value) => value || null);

const requirementSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(REQUIREMENT_KINDS),
  label: z.string().trim().max(200, "Use 200 characters or fewer"),
  importance: z.number().int().min(1).max(5),
  isRequired: z.boolean(),
});

export type RequirementInput = z.infer<typeof requirementSchema>;

/** Drops blank rows, gives skills their standard name, and merges skills that mean the same. */
function cleanRequirements(requirements: RequirementInput[]): RequirementInput[] {
  const seen = new Set<string>();
  const cleaned: RequirementInput[] = [];

  for (const requirement of requirements) {
    if (!requirement.label) continue;
    const isSkill = requirement.kind === "skill";
    const key = `${requirement.kind}:${
      isSkill ? normalizeSkill(requirement.label) : requirement.label.toLowerCase()
    }`;
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push({
      ...requirement,
      label: isSkill ? displaySkill(requirement.label) : requirement.label,
    });
  }

  return cleaned;
}

export const jobInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Enter a job title")
    .max(120, "Use 120 characters or fewer"),
  department: optionalText(120),
  location: optionalText(120),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship"]),
  salary: optionalText(120),
  description: z
    .string()
    .trim()
    .min(20, "Enter a job description of at least 20 characters")
    .max(20_000, "Use 20,000 characters or fewer"),
  requirements: z
    .array(requirementSchema)
    .max(60, "Use 60 requirements or fewer")
    .transform(cleanRequirements)
    .refine((list) => list.some((r) => r.kind === "skill"), {
      message: "Add at least one skill",
    }),
});

export type JobInput = z.infer<typeof jobInputSchema>;
export type JobFieldErrors = Partial<Record<keyof JobInput, string>>;

export function fieldErrors(error: z.ZodError): JobFieldErrors {
  const errors: JobFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof JobInput;
    errors[field] ??= issue.message;
  }
  return errors;
}
