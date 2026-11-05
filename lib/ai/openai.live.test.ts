import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { chunkResume } from "@/lib/matching/chunk";
import { ASSESSMENT_SYSTEM_PROMPT, assessmentOutput, assessmentResponseSchema, buildPrompt } from "@/lib/matching/prompt";
import { buildRequirements } from "@/lib/matching/requirements";
import { PARSE_RESPONSE_SCHEMA, PARSE_SYSTEM_PROMPT, toParsedResume } from "@/lib/resume/parse";

import { generateOpenAiJson } from "./openai";

// Real OpenAI calls that cost money. Run with: RUN_LIVE=1 vitest run lib/ai/openai.live.test.ts
const LIVE = Boolean(process.env.RUN_LIVE);

vi.mock("@/lib/env", () => ({
  serverEnv: {
    get openaiKey() {
      const line = readFileSync(".env", "utf8").split(/\r?\n/).find((l) => l.startsWith("OPENAI_API_KEY"));
      return line?.split("=")[1].trim().replace(/^"|"$/g, "");
    },
  },
}));

const HIRA = `Hira Malik
hira.fixture@example.invalid
Skills: Python, Django, PostgreSQL, Docker
Experience
Backend Developer, Lahore Tech, 2021 - 2024
Built REST APIs in Django backed by PostgreSQL and packaged every service with Docker.
Projects
Clinic Booking API: a Django service that lets patients book appointments.`;

const ZARA = `Zara Noor
zara.fixture@example.invalid
Skills: Python, Flask
Experience
Junior Developer, Karachi Soft, 2023 - 2024
Built small Flask tools. I have not worked with Docker or any container tools.`;

const JOB_ROWS = ["Python", "Django", "Docker", "Terraform"].map((label, i) => ({
  id: `req-${i}`, kind: "skill", label, importance: 4, is_required: true,
}));

function assessmentPrompt(resume: string) {
  const requirements = buildRequirements("Backend Developer", JOB_ROWS);
  const chunks = chunkResume(resume).map((c) => ({
    id: `chunk-${c.ordinal}`, section: c.section, content: c.content, similarity: 0.5,
  }));
  return { requirements, prompt: buildPrompt("Backend Developer", requirements.map((requirement) => ({ requirement, chunks }))) };
}

describe.skipIf(!LIVE)("the OpenAI fallback handles the real prompts", () => {
  it("parses a resume into the real schema with excerpts", async () => {
    const raw = await generateOpenAiJson(
      { system: PARSE_SYSTEM_PROMPT, prompt: `<resume>\n${HIRA}\n</resume>`, responseSchema: PARSE_RESPONSE_SCHEMA },
      30_000,
    );
    const parsed = toParsedResume(raw, HIRA);
    expect(parsed).toBeTruthy();
    expect(JSON.stringify(parsed)).toContain("Django");
  }, 40_000);

  it("assesses a strong resume as matched", async () => {
    const { requirements, prompt } = assessmentPrompt(HIRA);
    const output = assessmentOutput.parse(await generateOpenAiJson(
      { system: ASSESSMENT_SYSTEM_PROMPT, prompt, responseSchema: assessmentResponseSchema }, 30_000,
    ));
    expect(output.results.length).toBe(requirements.length);
    expect(output.results.filter((r) => r.status === "matched").length).toBeGreaterThanOrEqual(2);
  }, 40_000);

  it("keeps confirmed absence apart from no evidence", async () => {
    const { requirements, prompt } = assessmentPrompt(ZARA);
    const output = assessmentOutput.parse(await generateOpenAiJson(
      { system: ASSESSMENT_SYSTEM_PROMPT, prompt, responseSchema: assessmentResponseSchema }, 30_000,
    ));
    const statusOf = (label: string) =>
      output.results.find((r) => r.key === requirements.find((q) => q.label === label)?.key)?.status;
    expect(statusOf("Docker")).toBe("confirmed_absent");
    expect(statusOf("Terraform")).toBe("no_evidence");
  }, 40_000);
});
