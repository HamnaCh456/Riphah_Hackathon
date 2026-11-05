import { describe, expect, it } from "vitest";

import { applyCorrections, type ResumeData } from "./schema";

const RAW = "Ali Khan ali@example.com Built billing APIs at Acme using Django.";

const extracted: ResumeData = {
  name: "Ali Khan",
  email: "ali@example.com",
  phone: "",
  location: "",
  links: "",
  unverifiedContact: ["email"],
  experience: [
    {
      id: "e1",
      title: "Engineer",
      company: "Acme",
      dates: "",
      summary: "Built billing APIs",
      excerpt: "Built billing APIs at Acme",
      verified: true,
      source: "resume",
      edited: false,
    },
  ],
  projects: [],
  education: [],
};

describe("applyCorrections", () => {
  it("leaves unchanged items as resume evidence", () => {
    const result = applyCorrections(extracted, extracted, RAW);
    expect(result.experience[0]).toMatchObject({
      source: "resume",
      verified: true,
      edited: false,
    });
  });

  it("marks changed items as edited and keeps their excerpt", () => {
    const result = applyCorrections(
      {
        ...extracted,
        experience: [{ ...extracted.experience[0], company: "Acme Inc" }],
      },
      extracted,
      RAW,
    );
    expect(result.experience[0]).toMatchObject({
      company: "Acme Inc",
      edited: true,
      excerpt: "Built billing APIs at Acme",
    });
  });

  it("does not trust provenance sent by the browser", () => {
    const forged = {
      ...extracted.experience[0],
      id: "new-1",
      title: "CTO",
      excerpt: "CTO of Google",
      verified: true,
      source: "resume" as const,
    };
    const result = applyCorrections(
      { ...extracted, experience: [forged] },
      extracted,
      RAW,
    );
    expect(result.experience[0]).toMatchObject({
      title: "CTO",
      excerpt: null,
      verified: false,
      source: "candidate",
    });
  });

  it("cannot change an existing item's excerpt", () => {
    const result = applyCorrections(
      {
        ...extracted,
        experience: [{ ...extracted.experience[0], excerpt: "Forged text" }],
      },
      extracted,
      RAW,
    );
    expect(result.experience[0].excerpt).toBe("Built billing APIs at Acme");
  });

  it("removes items the candidate deleted", () => {
    const result = applyCorrections({ ...extracted, experience: [] }, extracted, RAW);
    expect(result.experience).toEqual([]);
  });

  it("clears a contact flag once the candidate changes that field", () => {
    const result = applyCorrections(
      { ...extracted, email: "ali@new.com" },
      extracted,
      RAW,
    );
    expect(result.unverifiedContact).toEqual([]);
  });
});
