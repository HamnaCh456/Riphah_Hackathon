import { describe, expect, it } from "vitest";

import { careerYears } from "./experience-years";

const NOW = new Date("2026-11-05T00:00:00Z");

describe("careerYears", () => {
  it("adds up separate jobs given in years", () => {
    expect(
      careerYears(
        ["Backend Engineer, Northwind, 2021 - 2025", "Junior Python Developer, 2020 - 2021"],
        NOW,
      ),
    ).toBe(5);
  });

  it("reads month names and an open-ended job", () => {
    expect(careerYears(["Developer, January 2022 – Present"], NOW)).toBe(4.8);
    expect(careerYears(["Developer, Mar 2023 to Feb 2024"], NOW)).toBe(1);
  });

  it("reads numeric months", () => {
    expect(careerYears(["Developer 01/2020 - 12/2020"], NOW)).toBe(1);
  });

  it("counts overlapping jobs once", () => {
    expect(careerYears(["Job A 2018 - 2022\nJob B 2020 - 2021"], NOW)).toBe(4);
  });

  it("stops a future end date at today", () => {
    expect(careerYears(["Contract, 2025 - 2030"], NOW)).toBe(1.8);
  });

  it("says unknown, not zero, when there are no dates", () => {
    expect(careerYears(["Built APIs for a logistics company"], NOW)).toBeNull();
    expect(careerYears([], NOW)).toBeNull();
  });

  it("doesn't treat a lone year or a range of numbers as a job", () => {
    expect(careerYears(["Won an award in 2021. Served 2-3 million requests."], NOW)).toBeNull();
  });
});
