import { describe, expect, it } from "vitest";

import { toParsedResume } from "./parse";

const RAW = `Sara Ahmed
sara@example.com
Built REST services with JS and Postgres at Acme.
JavaScript, Docker`;

const answer = {
  isResume: true,
  name: "Sara Ahmed",
  email: "sara@example.com",
  phone: "+92 300 0000000",
  location: "",
  links: "",
  skills: [
    { term: "JS", excerpt: "Built REST services with JS" },
    { term: "JavaScript", excerpt: "JavaScript, Docker" },
    { term: "Kubernetes", excerpt: "Managed Kubernetes clusters" },
  ],
  experience: [
    {
      title: "Engineer",
      company: "Acme",
      dates: "",
      summary: "Built REST services",
      excerpt: "Built REST services with JS and Postgres at Acme.",
    },
  ],
  projects: [],
  education: [],
};

describe("toParsedResume", () => {
  it("merges equivalent skills", () => {
    const result = toParsedResume(answer, RAW);
    if (!result?.isResume) throw new Error("expected a resume");
    expect(result.skills.map((s) => s.name)).toEqual(["JavaScript", "Kubernetes"]);
    expect(result.skills[0].rawTerm).toBe("JS");
  });

  it("flags a skill whose excerpt is not in the resume", () => {
    const result = toParsedResume(answer, RAW);
    if (!result?.isResume) throw new Error("expected a resume");
    expect(result.skills[0].verified).toBe(true);
    expect(result.skills[1].verified).toBe(false);
  });

  it("flags contact details that are not in the resume", () => {
    const result = toParsedResume(answer, RAW);
    if (!result?.isResume) throw new Error("expected a resume");
    expect(result.data.unverifiedContact).toEqual(["phone"]);
  });

  it("marks verified experience with its source", () => {
    const result = toParsedResume(answer, RAW);
    if (!result?.isResume) throw new Error("expected a resume");
    expect(result.data.experience[0]).toMatchObject({
      verified: true,
      source: "resume",
      edited: false,
    });
    expect(result.data.experience[0].id).toBeTruthy();
  });

  it("reports a document that is not a resume", () => {
    expect(toParsedResume({ ...answer, isResume: false }, RAW)).toEqual({ isResume: false });
  });

  it("returns null for an answer with the wrong shape", () => {
    expect(toParsedResume({ nonsense: true }, RAW)).toBeNull();
  });

  it("never stores fields outside the schema", () => {
    const result = toParsedResume({ ...answer, age: 41, gender: "F" }, RAW);
    if (!result?.isResume) throw new Error("expected a resume");
    expect(result.data).not.toHaveProperty("age");
    expect(result.data).not.toHaveProperty("gender");
  });
});
