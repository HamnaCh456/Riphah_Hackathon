import { readFileSync } from "node:fs";

import { beforeAll, describe, expect, it } from "vitest";

// Real Gemini, one request. Run with: RUN_LIVE=1 vitest run lib/trust/support-judge.live.test.ts
describe.runIf(Boolean(process.env.RUN_LIVE))("claim support check with real AI", () => {
  beforeAll(() => {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  });

  it("separates a supporting quote from a real but irrelevant one", async () => {
    const { geminiSupportJudge } = await import("./support-judge");
    const verdicts = await geminiSupportJudge([
      {
        claim: "Has: Docker",
        quotes: ["Built container images for each service and shipped them to Kubernetes."],
      },
      { claim: "Has: team leadership", quotes: ["Member of the university chess club."] },
    ]);
    console.log(verdicts);
    expect(verdicts.map((v) => v.supported)).toEqual([true, false]);
  }, 60_000);
});
