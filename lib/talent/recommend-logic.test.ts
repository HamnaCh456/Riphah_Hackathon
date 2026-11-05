import { expect, it } from "vitest";

import {
  buildProfileText,
  matchSkills,
  parseInterests,
  toPublicRecommendation,
} from "./recommend-logic";

it("builds the profile from verified skills, interests and project text", () => {
  const text = buildProfileText(["Django"], ["fintech"], ["Built a payment service"]);
  expect(text).toContain("Django");
  expect(text).toContain("fintech");
  expect(text).toContain("Built a payment service");
});

it("matches a skill by normalised name or by meaning, and not otherwise", () => {
  const fits = matchSkills(
    ["Postgres", "Containers", "Marketing"],
    [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    ["PostgreSQL", "Docker"],
    [
      [0.5, 0.5],
      [1, 0],
    ],
  );
  expect(fits.has("Postgres")).toBe(true);
  expect(fits.has("Containers")).toBe(true);
  expect(fits.has("Marketing")).toBe(false);
});

it("limits interests typed into the page", () => {
  expect(parseInterests(" fintech, ,backend ")).toEqual(["fintech", "backend"]);
  expect(parseInterests(undefined)).toEqual([]);
  expect(parseInterests(Array(20).fill("x").join(","))).toHaveLength(10);
});

it("removes anything that would act as a score", () => {
  const output = toPublicRecommendation({
    jobId: "j1",
    title: "Dev",
    description: "Build things",
    similarity: 0.91,
    matchedSkills: ["Django"],
    otherRequirements: ["Docker"],
  });
  expect(JSON.stringify(output)).not.toMatch(/similarity|score|0\.91/);
  expect(output.matchedSkills).toEqual(["Django"]);
});
