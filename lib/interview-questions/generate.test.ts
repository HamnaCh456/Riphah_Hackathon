// lib/interview-questions/generate.test.ts
import { describe, expect, it, vi } from 'vitest';
import { generateOneQuestion, generateQuestionSet, QuestionGenerationError } from '@/lib/interview-questions/generate';
import type { GeneratedQuestion, QuestionInput } from '@/lib/interview-questions/schema';

const input: QuestionInput = {
  jobTitle: 'Backend Developer', jobDescription: 'APIs.',
  skills: [{ skill: 'Django', importance: 'required', result: 'matched' }],
  projects: [{ id: 'p1', label: 'Shopwise', excerpt: 'Built the Shopwise order API with Django.' }],
};

const role = (difficulty: GeneratedQuestion['difficulty']): GeneratedQuestion => ({
  kind: 'role', difficulty, skill: 'Django', question: `A ${difficulty} Django question?`,
  answer_guidelines: 'A strong answer explains the reasoning.', evidence_id: null, evidence_quote: null,
});
const project: GeneratedQuestion = {
  kind: 'project', difficulty: 'advanced', skill: 'Django',
  question: 'Why did you structure the Shopwise order API that way?',
  answer_guidelines: 'A strong answer explains the trade-offs.',
  evidence_id: 'p1', evidence_quote: 'Shopwise order API',
};
const full = { questions: [role('beginner'), role('intermediate'), role('advanced'), project] };

describe('generateQuestionSet', () => {
  it('returns checked questions from a complete response', async () => {
    const result = await generateQuestionSet(input, vi.fn().mockResolvedValue(full));
    expect(result).toHaveLength(4);
    expect(result.find((q) => q.kind === 'project')?.support).toBe('verified');
  });

  it('retries once when a difficulty level is missing', async () => {
    const llm = vi.fn()
      .mockResolvedValueOnce({ questions: [role('beginner'), project] })
      .mockResolvedValueOnce(full);
    await generateQuestionSet(input, llm);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('retries once on malformed output', async () => {
    const llm = vi.fn().mockResolvedValueOnce({ nope: true }).mockResolvedValueOnce(full);
    expect(await generateQuestionSet(input, llm)).toHaveLength(4);
  });

  it('throws rather than inventing questions after two failures', async () => {
    const llm = vi.fn().mockRejectedValue(new Error('503'));
    await expect(generateQuestionSet(input, llm)).rejects.toBeInstanceOf(QuestionGenerationError);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('does not need a project question when the candidate has none', async () => {
    const llm = vi.fn().mockResolvedValue({ questions: full.questions.slice(0, 3) });
    expect(await generateQuestionSet({ ...input, projects: [] }, llm)).toHaveLength(3);
    expect(llm).toHaveBeenCalledTimes(1);
  });
});

describe('generateOneQuestion', () => {
  it('returns a question matching the requested slot', async () => {
    const result = await generateOneQuestion(input,
      { kind: 'project', difficulty: 'advanced', skill: 'Django' }, ['Old question?'],
      vi.fn().mockResolvedValue({ questions: [project] }));
    expect(result).toMatchObject({ kind: 'project', support: 'verified' });
  });

  it('keeps the requested difficulty even if the model returns another', async () => {
    const result = await generateOneQuestion(input,
      { kind: 'role', difficulty: 'beginner', skill: 'Django' }, [],
      vi.fn().mockResolvedValue({ questions: [role('advanced')] }));
    expect(result.difficulty).toBe('beginner');
  });

  it('throws when the model repeats an existing question', async () => {
    const q = role('beginner');
    const llm = vi.fn().mockResolvedValue({ questions: [q] });
    await expect(generateOneQuestion(input,
      { kind: 'role', difficulty: 'beginner', skill: 'Django' }, [q.question], llm))
      .rejects.toBeInstanceOf(QuestionGenerationError);
  });
});
