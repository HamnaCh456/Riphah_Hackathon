import { describe, expect, it } from "vitest";

import { displaySkill, mergeSkills, normalizeSkill } from "./normalize";

describe("normalizeSkill", () => {
  it.each([
    ["JS", "javascript"],
    ["javascript", "javascript"],
    ["Java Script", "javascript"],
    ["Postgres", "postgresql"],
    ["PostgreSQL", "postgresql"],
    ["k8s", "kubernetes"],
    ["Node", "node.js"],
    ["NodeJS", "node.js"],
    ["node.js", "node.js"],
    ["ReactJS", "react"],
    ["py", "python"],
    ["Python3", "python"],
    ["TS", "typescript"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizeSkill(input)).toBe(expected);
  });

  it("keeps skills that sound alike apart", () => {
    expect(normalizeSkill("Java")).not.toBe(normalizeSkill("JavaScript"));
    expect(normalizeSkill("C")).not.toBe(normalizeSkill("C++"));
    expect(normalizeSkill("C++")).not.toBe(normalizeSkill("C#"));
    expect(normalizeSkill("React")).not.toBe(normalizeSkill("React Native"));
  });

  it("lowercases and tidies skills it does not know", () => {
    expect(normalizeSkill("  Apache   Kafka ")).toBe("apache kafka");
  });
});

describe("displaySkill", () => {
  it("uses the standard name for known skills", () => {
    expect(displaySkill("js")).toBe("JavaScript");
    expect(displaySkill("postgres")).toBe("PostgreSQL");
  });

  it("keeps the original wording for unknown skills", () => {
    expect(displaySkill("  Apache   Kafka ")).toBe("Apache Kafka");
  });
});

describe("mergeSkills", () => {
  it("merges equivalent terms and remembers the wording used", () => {
    const merged = mergeSkills([
      { term: "JS", excerpt: "Built apps in JS" },
      { term: "JavaScript", excerpt: "JavaScript and HTML" },
      { term: "Docker", excerpt: "Docker images" },
    ]);

    expect(merged).toEqual([
      {
        name: "JavaScript",
        normalizedName: "javascript",
        rawTerm: "JS",
        excerpt: "Built apps in JS",
      },
      {
        name: "Docker",
        normalizedName: "docker",
        rawTerm: "Docker",
        excerpt: "Docker images",
      },
    ]);
  });

  it("uses the first available excerpt when merging", () => {
    const merged = mergeSkills([
      { term: "JS", excerpt: null },
      { term: "JavaScript", excerpt: "JavaScript and HTML" },
    ]);

    expect(merged[0].excerpt).toBe("JavaScript and HTML");
  });

  it("drops blank terms", () => {
    expect(mergeSkills([{ term: "   ", excerpt: null }])).toEqual([]);
  });
});
