import { beforeEach, expect, it, vi } from "vitest";

const generateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
vi.mock("@/lib/env", () => ({ serverEnv: { geminiKey: "test" } }));

import { AiError, generateJson } from "./gemini";

const ARGS = { system: "s", prompt: "p", responseSchema: {} };
const modelsTried = () => generateContent.mock.calls.map(([call]) => call.model);

beforeEach(() => {
  generateContent.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

it("uses the first model when it works", async () => {
  generateContent.mockResolvedValue({ text: '{"ok":true}' });
  await expect(generateJson(ARGS)).resolves.toEqual({ ok: true });
  expect(modelsTried()).toEqual(["gemini-2.5-flash"]);
});

it("moves to the next model when the quota has run out", async () => {
  generateContent
    .mockRejectedValueOnce(new Error("429 RESOURCE_EXHAUSTED"))
    .mockResolvedValueOnce({ text: '{"ok":true}' });
  await expect(generateJson(ARGS)).resolves.toEqual({ ok: true });
  expect(modelsTried()).toEqual(["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
});

it("moves on when a reply is not valid JSON", async () => {
  generateContent
    .mockResolvedValueOnce({ text: "not json" })
    .mockResolvedValueOnce({ text: '{"ok":true}' });
  await expect(generateJson(ARGS)).resolves.toEqual({ ok: true });
});

it("sends a thinking budget only to models that accept one", async () => {
  generateContent
    .mockRejectedValueOnce(new Error("429"))
    .mockRejectedValueOnce(new Error("429"))
    .mockResolvedValueOnce({ text: '{"ok":true}' });
  await generateJson(ARGS);
  const [flash, , newer] = generateContent.mock.calls.map(([call]) => call);
  expect(flash.config.thinkingConfig).toBeDefined();
  expect(newer.model).toBe("gemini-3.5-flash-lite");
  expect(newer.config.thinkingConfig).toBeUndefined();
});

it("throws an AiError rather than inventing a result when every model fails", async () => {
  generateContent.mockRejectedValue(new Error("429"));
  await expect(generateJson(ARGS)).rejects.toBeInstanceOf(AiError);
  expect(generateContent).toHaveBeenCalledTimes(3);
});
