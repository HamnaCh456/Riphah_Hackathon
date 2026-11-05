import "server-only";

import { GoogleGenAI } from "@google/genai";

import { serverEnv } from "@/lib/env";

import { generateOpenAiJson, OPENAI_MODEL } from "./openai";

// Tried in order. Quotas are per model, so when one runs out or is overloaded the next still works.
// Google has closed the 2.5 models to new API keys, so only models this key can reach are listed.
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"];
const TIMEOUT_MS = 25_000;
// Together these stay below the 60-second page limit, so the caller can still show a retry message.
const GEMINI_BUDGET_MS = 30_000;
const OPENAI_TIMEOUT_MS = 25_000;

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
      abortSignal: AbortSignal.timeout(timeoutMs),
    },
  });
  return JSON.parse(response.text ?? "");
}

/**
 * Returns the parsed JSON answer, trying the free Gemini models first and paid OpenAI last.
 * Set singleModel when results will be compared, because a model change would look like a real
 * difference. Throws AiError if every try fails.
 */
export async function generateJson(args: {
  system: string;
  prompt: string;
  responseSchema: object;
  singleModel?: boolean;
}): Promise<unknown> {
  if (args.singleModel) {
    try {
      return await attempt(MODELS[0], TIMEOUT_MS, args);
    } catch (error) {
      console.error(`Gemini model ${MODELS[0]} failed`, error);
      throw new AiError("The AI service did not return a usable answer", { cause: error });
    }
  }

  const deadline = Date.now() + GEMINI_BUDGET_MS;
  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      return await attempt(model, Math.min(TIMEOUT_MS, remaining), args);
    } catch (error) {
      console.warn(`Gemini model ${model} failed, trying the next one`, error);
    }
  }

  try {
    const answer = await generateOpenAiJson(args, OPENAI_TIMEOUT_MS);
    console.warn(`Answered by the ${OPENAI_MODEL} fallback`);
    return answer;
  } catch (error) {
    console.error("Every AI model failed", error);
    throw new AiError("The AI service did not return a usable answer", { cause: error });
  }
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
