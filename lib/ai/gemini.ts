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
