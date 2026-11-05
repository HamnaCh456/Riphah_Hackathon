// lib/interview-questions/generate.ts
import { buildSetPrompt, SYSTEM_PROMPT } from './prompt';
import { DIFFICULTIES, GEMINI_SET_SCHEMA, generatedSetSchema } from './schema';
import type { QuestionDraft, QuestionInput } from './schema';

export type Llm = (args: { system: string; prompt: string; responseSchema: object }) => Promise<unknown>;

export class QuestionGenerationError extends Error {}

const MAX_ATTEMPTS = 2;

export async function generateQuestionSet(input: QuestionInput, llm: Llm): Promise<QuestionDraft[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await llm({
        system: SYSTEM_PROMPT, prompt: buildSetPrompt(input), responseSchema: GEMINI_SET_SCHEMA,
      });
      const { questions } = generatedSetSchema.parse(raw);
      if (DIFFICULTIES.every((d) => questions.some((q) => q.difficulty === d))) return questions;
      lastError = new Error('Response was missing a difficulty level');
    } catch (error) {
      lastError = error;
    }
  }
  throw new QuestionGenerationError(`Question generation failed: ${String(lastError)}`);
}
