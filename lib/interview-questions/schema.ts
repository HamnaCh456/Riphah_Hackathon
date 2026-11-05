// lib/interview-questions/schema.ts
import { z } from 'zod';

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export type QuestionKind = 'role' | 'project';
export type Support = 'not_applicable' | 'verified' | 'needs_review';

export const generatedQuestionSchema = z.object({
  kind: z.enum(['role', 'project']),
  difficulty: z.enum(DIFFICULTIES),
  skill: z.string().nullable(),
  question: z.string().trim().min(10),
  answer_guidelines: z.string().trim().min(10),
  evidence_id: z.string().nullable(),
  evidence_quote: z.string().nullable(),
});
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const generatedSetSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

export type ProjectEvidence = { id: string; label: string; excerpt: string };

export type QuestionInput = {
  jobTitle: string;
  jobDescription: string;
  skills: { skill: string; importance: 'required' | 'preferred';
            result: 'matched' | 'partial' | 'no_evidence' | 'confirmed_absent' | 'not_assessed' }[];
  projects: ProjectEvidence[];
};

export type QuestionDraft = {
  kind: QuestionKind;
  difficulty: Difficulty;
  skill: string | null;
  question: string;
  answer_guidelines: string;
  evidence_id: string | null;
  evidence_quote: string | null;
  support: Support;
};

export const GEMINI_SET_SCHEMA = {
  type: 'OBJECT',
  required: ['questions'],
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['kind', 'difficulty', 'skill', 'question', 'answer_guidelines',
                   'evidence_id', 'evidence_quote'],
        properties: {
          kind: { type: 'STRING', enum: ['role', 'project'] },
          difficulty: { type: 'STRING', enum: [...DIFFICULTIES] },
          skill: { type: 'STRING', nullable: true },
          question: { type: 'STRING' },
          answer_guidelines: { type: 'STRING' },
          evidence_id: { type: 'STRING', nullable: true },
          evidence_quote: { type: 'STRING', nullable: true },
        },
      },
    },
  },
} as const;
