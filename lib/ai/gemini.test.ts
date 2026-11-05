import { beforeEach, expect, it, vi } from "vitest";

const generateContent = vi.hoisted(() => vi.fn());
const generateOpenAiJson = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
vi.mock("./openai", () => ({ generateOpenAiJson, OPENAI_MODEL: "gpt-4o-mini" }));
vi.mock("@/lib/env", () => ({ serverEnv: { geminiKey: "test" } }));

import { AiError, generateJson } from "./gemini";

const ARGS = { system: "s", prompt: "p", responseSchema: {} };
const modelsTried = () => generateContent.mock.calls.map(([call]) => call.model);

beforeEach(() => {
  generateContent.mockReset();
  generateOpenAiJson.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

it("uses the first model when it works", async () => {
  generateContent.mockResolvedValue({ text: '{"ok":true}' });
  await expect(generateJson(ARGS)).resolves.toEqual({ ok: true });
  expect(modelsTried()).toEqual(["gemini-3.5-flash-lite"]);
});

it("moves to the next model when the quota has run out", async () => {
  generateContent
    .mockRejectedValueOnce(new Error("429 RESOURCE_EXHAUSTED"))
    .mockResolvedValueOnce({ text: '{"ok":true}' });
  await expect(generateJson(ARGS)).resolves.toEqual({ ok: true });
  expect(modelsTried()).toEqual(["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
});

it("moves on when a reply is not valid JSON", async () => {
  generateContent
    .mockResolvedValueOnce({ text: "not json" })
    .mockResolvedValueOnce({ text: '{"ok":true}' });
  await expect(generateJson(ARGS)).resolves.toEqual({ ok: true });
});

it("doesn't call paid OpenAI while a Gemini model works", async () => {
  generateContent.mockResolvedValue({ text: '{"ok":true}' });
  await generateJson(ARGS);
  expect(generateOpenAiJson).not.toHaveBeenCalled();
});

it("falls back to OpenAI when every Gemini model fails", async () => {
  generateContent.mockRejectedValue(new Error("429"));
  generateOpenAiJson.mockResolvedValue({ from: "openai" });
  await expect(generateJson(ARGS)).resolves.toEqual({ from: "openai" });
  expect(generateContent).toHaveBeenCalledTimes(3);
});

it("throws an AiError rather than inventing a result when every model fails", async () => {
  generateContent.mockRejectedValue(new Error("429"));
  generateOpenAiJson.mockRejectedValue(new Error("500"));
  await expect(generateJson(ARGS)).rejects.toBeInstanceOf(AiError);
});

it("never switches model when results will be compared", async () => {
  generateContent.mockRejectedValue(new Error("429"));
  await expect(generateJson({ ...ARGS, singleModel: true })).rejects.toBeInstanceOf(AiError);
  expect(generateContent).toHaveBeenCalledTimes(1);
  expect(generateOpenAiJson).not.toHaveBeenCalled();
});
