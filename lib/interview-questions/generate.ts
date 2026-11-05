// lib/interview-questions/generate.ts
import { buildOnePrompt, buildSetPrompt, SYSTEM_PROMPT } from './prompt';
import { DIFFICULTIES, GEMINI_SET_SCHEMA, generatedSetSchema } from './schema';
import type { Difficulty, GeneratedQuestion, QuestionDraft, QuestionInput, QuestionKind } from './schema';
import { verifyQuestion } from './verify';

export type Llm = (args: { system: string; prompt: string; responseSchema: object }) => Promise<unknown>;

export class QuestionGenerationError extends Error {}

const MAX_ATTEMPTS = 2;

function isComplete(questions: GeneratedQuestion[], input: QuestionInput): boolean {
  const hasEveryLevel = DIFFICULTIES.every((d) =>
    questions.some((q) => q.kind === 'role' && q.difficulty === d));
  const hasProjectQuestion = input.projects.length === 0 || questions.some((q) => q.kind === 'project');
  return hasEveryLevel && hasProjectQuestion;
}

export async function generateQuestionSet(input: QuestionInput, llm: Llm): Promise<QuestionDraft[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await llm({
        system: SYSTEM_PROMPT, prompt: buildSetPrompt(input), responseSchema: GEMINI_SET_SCHEMA,
      });
      const { questions } = generatedSetSchema.parse(raw);
      if (isComplete(questions, input)) {
        return questions.map((q) => verifyQuestion(q, input.projects));
      }
      lastError = new Error('Response was missing a difficulty level or project question');
    } catch (error) {
      lastError = error;
    }
  }
  throw new QuestionGenerationError(`Question generation failed: ${String(lastError)}`);
}

export async function generateOneQuestion(
  input: QuestionInput,
  target: { kind: QuestionKind; difficulty: Difficulty; skill: string | null },
  avoid: string[],
  llm: Llm,
): Promise<QuestionDraft> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await llm({
        system: SYSTEM_PROMPT, prompt: buildOnePrompt(input, target, avoid),
        responseSchema: GEMINI_SET_SCHEMA,
      });
      const { questions } = generatedSetSchema.parse(raw);
      const match = questions.find((q) => q.kind === target.kind && !avoid.includes(q.question));
      if (match) return verifyQuestion({ ...match, difficulty: target.difficulty }, input.projects);
      lastError = new Error('No new question of the requested kind');
    } catch (error) {
      lastError = error;
    }
  }
  throw new QuestionGenerationError(`Question regeneration failed: ${String(lastError)}`);
}
