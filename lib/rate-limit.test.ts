import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit, then blocks", () => {
    const isAllowed = createRateLimiter(2);
    expect(isAllowed("a", 0)).toBe(true);
    expect(isAllowed("a", 1)).toBe(true);
    expect(isAllowed("a", 2)).toBe(false);
  });

  it("counts each client separately", () => {
    const isAllowed = createRateLimiter(1);
    expect(isAllowed("a", 0)).toBe(true);
    expect(isAllowed("b", 0)).toBe(true);
    expect(isAllowed("a", 1)).toBe(false);
  });

  it("starts again after a minute", () => {
    const isAllowed = createRateLimiter(1);
    expect(isAllowed("a", 0)).toBe(true);
    expect(isAllowed("a", 59_999)).toBe(false);
    expect(isAllowed("a", 60_000)).toBe(true);
  });
});
