import { describe, expect, it } from "vitest";

import { jobInputSchema } from "./schema";

const valid = {
  title: "Backend Developer",
  department: "",
  location: " Lahore ",
  employmentType: "full_time",
  salary: "",
  description: "We need a backend developer to build our APIs.",
  requirements: [
    { kind: "skill", label: "Python", importance: 5, isRequired: true },
  ],
};

describe("jobInputSchema", () => {
  it("accepts a valid job and turns blank optional fields into null", () => {
    const job = jobInputSchema.parse(valid);
    expect(job.department).toBeNull();
    expect(job.location).toBe("Lahore");
  });

  it("gives skills their standard name and merges equivalents", () => {
    const job = jobInputSchema.parse({
      ...valid,
      requirements: [
        { kind: "skill", label: "postgres", importance: 5, isRequired: true },
        { kind: "skill", label: "PostgreSQL", importance: 2, isRequired: false },
        { kind: "skill", label: "  ", importance: 3, isRequired: true },
      ],
    });
    expect(job.requirements).toEqual([
      { kind: "skill", label: "PostgreSQL", importance: 5, isRequired: true },
    ]);
  });

  it("does not rename experience or qualification text", () => {
    const job = jobInputSchema.parse({
      ...valid,
      requirements: [
        ...valid.requirements,
        { kind: "experience", label: "3 years with js", importance: 3, isRequired: true },
      ],
    });
    expect(job.requirements[1].label).toBe("3 years with js");
  });

  it("requires a title, a description and at least one skill", () => {
    const result = jobInputSchema.safeParse({
      ...valid,
      title: " ",
      description: "short",
      requirements: [],
    });
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining(["title", "description", "requirements"]),
    );
  });

  it("rejects importance outside 1 to 5", () => {
    const result = jobInputSchema.safeParse({
      ...valid,
      requirements: [
        { kind: "skill", label: "Python", importance: 9, isRequired: true },
      ],
    });
    expect(result.success).toBe(false);
  });
});
