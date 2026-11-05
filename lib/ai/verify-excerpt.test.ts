import { describe, expect, it } from "vitest";

import { excerptAppearsIn } from "./verify-excerpt";

const SOURCE = `Senior Engineer at Acme
• Built REST APIs in Python
  and Django, serving 2M users.
Used C++ for the “core” engine.`;

describe("excerptAppearsIn", () => {
  it("finds an exact quote", () => {
    expect(excerptAppearsIn("Built REST APIs in Python", SOURCE)).toBe(true);
  });

  it("ignores case, line breaks, bullets and curly quotes", () => {
    expect(
      excerptAppearsIn("built rest apis in python and django", SOURCE),
    ).toBe(true);
    expect(excerptAppearsIn('the "core" engine', SOURCE)).toBe(true);
    expect(excerptAppearsIn("• Built REST APIs", SOURCE)).toBe(true);
  });

  it("rejects text that is not in the source", () => {
    expect(excerptAppearsIn("Led a team of 40 engineers", SOURCE)).toBe(false);
  });

  it("keeps + and # so C++ is not treated as C", () => {
    expect(excerptAppearsIn("C#", "Used C for firmware")).toBe(false);
    expect(excerptAppearsIn("C++", SOURCE)).toBe(true);
  });

  it("rejects empty or punctuation-only quotes", () => {
    expect(excerptAppearsIn("", SOURCE)).toBe(false);
    expect(excerptAppearsIn(null, SOURCE)).toBe(false);
    expect(excerptAppearsIn(" ... ", SOURCE)).toBe(false);
  });
});
