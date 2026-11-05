import "server-only";

import { GoogleGenAI } from "@google/genai";

import { serverEnv } from "@/lib/env";

// Tried in order. Quotas are per model, so when one runs out or is overloaded the next still works.
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash-lite"];
const TIMEOUT_MS = 25_000;
// Below the 60-second page limit, so the caller can still show a retry message.
const TOTAL_BUDGET_MS = 50_000;

/** The AI could not give a usable answer. Callers show a retry, never a made-up result. */
export class AiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiError";
  }
}

async function attempt(
  model: string,
  timeoutMs: number,
  args: {
    system: string;
    prompt: string;
    responseSchema: object;
  },
): Promise<unknown> {
  const client = new GoogleGenAI({ apiKey: serverEnv.geminiKey });
  const response = await client.models.generateContent({
    model,
    contents: args.prompt,
    config: {
      systemInstruction: args.system,
      responseMimeType: "application/json",
      responseSchema: args.responseSchema,
      temperature: 0,
      // Only the 2.5 models accept a thinking budget.
      ...(model.startsWith("gemini-2.5")
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : {}),
      abortSignal: AbortSignal.timeout(timeoutMs),
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
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError: unknown;
  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      return await attempt(model, Math.min(TIMEOUT_MS, remaining), args);
    } catch (error) {
      lastError = error;
      console.warn(`Gemini model ${model} failed, trying the next one`);
    }
  }
  console.error("Gemini request failed", lastError);
  throw new AiError("The AI service did not return a usable answer", {
    cause: lastError,
  });
}

const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768;
const EMBED_BATCH = 100;
const EMBED_ATTEMPTS = 3;

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

async function embedBatch(texts: string[], taskType: EmbedTaskType): Promise<number[][]> {
  const client = new GoogleGenAI({ apiKey: serverEnv.geminiKey });
  const response = await client.models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
    config: {
      taskType,
      outputDimensionality: EMBED_DIMENSIONS,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });
  const vectors = (response.embeddings ?? []).map((embedding) => embedding.values ?? []);
  if (
    vectors.length !== texts.length ||
    vectors.some((vector) => vector.length !== EMBED_DIMENSIONS)
  ) {
    throw new Error("Gemini returned embeddings of the wrong shape");
  }
  return vectors;
}

/** One 768-dimension vector per text, in order. Throws AiError if every try fails. */
export async function embedTexts(
  texts: string[],
  taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += EMBED_BATCH) {
    const batch = texts.slice(start, start + EMBED_BATCH);
    let lastError: unknown;
    let embedded: number[][] | null = null;
    for (let i = 0; i < EMBED_ATTEMPTS && !embedded; i++) {
      if (i > 0) await new Promise((done) => setTimeout(done, 1000 * 2 ** i));
      try {
        embedded = await embedBatch(batch, taskType);
      } catch (error) {
        lastError = error;
      }
    }
    if (!embedded) {
      console.error("Gemini embedding failed", lastError);
      throw new AiError("The AI service could not process this text", { cause: lastError });
    }
    vectors.push(...embedded);
  }
  return vectors;
}
