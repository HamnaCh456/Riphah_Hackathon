// lib/interview-questions/schema.ts
import { z } from 'zod';

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const generatedQuestionSchema = z.object({
  difficulty: z.enum(DIFFICULTIES),
  skill: z.string().nullable(),
  question: z.string().trim().min(10),
  answer_guidelines: z.string().trim().min(10),
});
export type QuestionDraft = z.infer<typeof generatedQuestionSchema>;

export const generatedSetSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

/** Only the job. The set is shared by every applicant, so it holds nothing about any one person. */
export type QuestionInput = {
  jobTitle: string;
  jobDescription: string;
  skills: { skill: string; importance: 'required' | 'preferred' }[];
};

export const GEMINI_SET_SCHEMA = {
  type: 'OBJECT',
  required: ['questions'],
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['difficulty', 'skill', 'question', 'answer_guidelines'],
        properties: {
          difficulty: { type: 'STRING', enum: [...DIFFICULTIES] },
          skill: { type: 'STRING', nullable: true },
          question: { type: 'STRING' },
          answer_guidelines: { type: 'STRING' },
        },
      },
    },
  },
} as const;
