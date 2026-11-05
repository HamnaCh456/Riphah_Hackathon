// lib/interview-questions/generate.test.ts
import { describe, expect, it, vi } from 'vitest';
import { generateQuestionSet, QuestionGenerationError } from '@/lib/interview-questions/generate';
import type { QuestionDraft, QuestionInput } from '@/lib/interview-questions/schema';

const input: QuestionInput = {
  jobTitle: 'Backend Developer', jobDescription: 'APIs.',
  skills: [{ skill: 'Django', importance: 'required' }],
};

const question = (difficulty: QuestionDraft['difficulty']): QuestionDraft => ({
  difficulty, skill: 'Django', question: `A ${difficulty} Django question?`,
  answer_guidelines: 'A strong answer explains the reasoning.',
});
const full = { questions: [question('beginner'), question('intermediate'), question('advanced')] };

describe('generateQuestionSet', () => {
  it('returns the questions from a complete response', async () => {
    expect(await generateQuestionSet(input, vi.fn().mockResolvedValue(full))).toHaveLength(3);
  });

  it('retries once when a difficulty level is missing', async () => {
    const llm = vi.fn()
      .mockResolvedValueOnce({ questions: [question('beginner')] })
      .mockResolvedValueOnce(full);
    await generateQuestionSet(input, llm);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('retries once on malformed output', async () => {
    const llm = vi.fn().mockResolvedValueOnce({ nope: true }).mockResolvedValueOnce(full);
    expect(await generateQuestionSet(input, llm)).toHaveLength(3);
  });

  it('throws rather than inventing questions after two failures', async () => {
    const llm = vi.fn().mockRejectedValue(new Error('503'));
    await expect(generateQuestionSet(input, llm)).rejects.toBeInstanceOf(QuestionGenerationError);
    expect(llm).toHaveBeenCalledTimes(2);
  });
});
