import { describe, expect, it } from "vitest";

import {
  documentSimilarity,
  findDuplicatePairs,
  normalizeEmail,
  normalizePhone,
  type DuplicateRecord,
} from "./detect";

function record(id: string, fields: Partial<DuplicateRecord>): DuplicateRecord {
  return { candidateId: id, name: id, emails: [], phones: [], resumeText: "", ...fields };
}

describe("normalizeEmail", () => {
  it.each([
    [" Noor.Ahmed@Gmail.com ", "noorahmed@gmail.com"],
    ["noor.ahmed+jobs@googlemail.com", "noorahmed@gmail.com"],
    ["Noor.Ahmed+x@company.com", "noor.ahmed+x@company.com"],
  ])("%s becomes %s", (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
  });

  it.each([[null], [""], ["not-an-email"]])("returns null for %s", (input) => {
    expect(normalizeEmail(input)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it.each([["+92 300 1234567"], ["0092-300-1234567"], ["0300 1234567"], ["(0300) 123-4567"]])(
    "%s becomes one form",
    (input) => {
      expect(normalizePhone(input)).toBe("3001234567");
    },
  );

  it.each([[null], [""], ["12345"]])("returns null for %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("documentSimilarity", () => {
  it("is 1 for the same words and 0 for none in common", () => {
    expect(documentSimilarity("Built Django APIs", "built  django, apis")).toBe(1);
    expect(documentSimilarity("Built Django APIs", "Ran focus groups")).toBe(0);
    expect(documentSimilarity("", "anything")).toBe(0);
  });
});

describe("findDuplicatePairs", () => {
  it("flags the same phone written differently", () => {
    const [pair] = findDuplicatePairs([
      record("a", { phones: ["+92 300 1112233"] }),
      record("b", { phones: ["0300-1112233"] }),
    ]);
    expect(pair.reasons).toEqual(["Same phone number"]);
  });

  it("flags the same email written differently", () => {
    const [pair] = findDuplicatePairs([
      record("a", { emails: ["noor.ahmed@gmail.com"] }),
      record("b", { emails: ["NoorAhmed+jobs@gmail.com"] }),
    ]);
    expect(pair.reasons).toEqual(["Same email address"]);
  });

  it("flags near-identical resumes with different contact details", () => {
    const text = "Built order services in Django and PostgreSQL with Docker for a logistics company";
    const [pair] = findDuplicatePairs([
      record("a", { emails: ["one@x.com"], resumeText: text }),
      record("b", { emails: ["two@x.com"], resumeText: text }),
    ]);
    expect(pair.reasons[0]).toMatch(/100% the same/);
  });

  it("does not flag different people, even with the same name", () => {
    expect(
      findDuplicatePairs([
        { ...record("a", { emails: ["a@x.com"], resumeText: "Sold shoes" }), name: "Ali" },
        { ...record("b", { emails: ["b@x.com"], resumeText: "Wrote compilers" }), name: "Ali" },
      ]),
    ).toEqual([]);
  });

  it("does not match on missing contact details", () => {
    expect(
      findDuplicatePairs([record("a", { phones: ["123"] }), record("b", { phones: ["456"] })]),
    ).toEqual([]);
  });
});
