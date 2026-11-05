import "server-only";

import { GoogleGenAI } from "@google/genai";

import { serverEnv } from "@/lib/env";

const MODEL = "gemini-2.5-flash";
const ATTEMPTS = 2;
const TIMEOUT_MS = 25_000;

/** The AI could not give a usable answer. Callers show a retry, never a made-up result. */
export class AiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiError";
  }
}

async function attempt(args: {
  system: string;
  prompt: string;
  responseSchema: object;
}): Promise<unknown> {
  const client = new GoogleGenAI({ apiKey: serverEnv.geminiKey });
  const response = await client.models.generateContent({
    model: MODEL,
    contents: args.prompt,
    config: {
      systemInstruction: args.system,
      responseMimeType: "application/json",
      responseSchema: args.responseSchema,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });
  return JSON.parse(response.text ?? "");
}

/** Calls Gemini in JSON mode and returns the parsed answer. Throws AiError if every try fails. */
export async function generateJson(args: {
  system: string;
  prompt: string;
  responseSchema: object;
}): Promise<unknown> {
  let lastError: unknown;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      return await attempt(args);
    } catch (error) {
      lastError = error;
    }
  }
  console.error("Gemini request failed", lastError);
  throw new AiError("The AI service did not return a usable answer", {
    cause: lastError,
  });
}
