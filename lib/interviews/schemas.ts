// lib/interviews/schemas.ts
import { z } from 'zod';

export const INTERVIEW_TYPES = [
  { value: 'phone_screen', label: 'Phone screen' },
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR' },
  { value: 'final', label: 'Final' },
] as const;

export const DURATIONS = [30, 45, 60, 90] as const;

export const RECOMMENDATIONS = [
  { value: 'advance', label: 'Advance' },
  { value: 'hold', label: 'Hold' },
  { value: 'do_not_advance', label: 'Do not advance' },
] as const;

// Job-related criteria only: nothing here invites comments on personal characteristics.
export const RATING_CRITERIA = [
  { key: 'technical_skill', label: 'Technical skill' },
  { key: 'problem_solving', label: 'Problem solving' },
  { key: 'communication', label: 'Communication' },
  { key: 'job_knowledge', label: 'Job knowledge' },
] as const;

export const scheduleSchema = z.object({
  applicationId: z.string().uuid(),
  interviewId: z.string().uuid().nullable(),
  interviewerId: z.string().uuid('Choose an interviewer'),
  type: z.enum(['phone_screen', 'technical', 'hr', 'final'], { message: 'Choose an interview type' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time'),
  durationMinutes: z.number().refine((n) => (DURATIONS as readonly number[]).includes(n), 'Choose a duration'),
  acknowledgeConflict: z.boolean(),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

const rating = z.number({ message: 'Rate every criterion' }).int().min(1, 'Rate every criterion').max(5);

export const feedbackSchema = z.object({
  interviewId: z.string().uuid(),
  technical_skill: rating,
  problem_solving: rating,
  communication: rating,
  job_knowledge: rating,
  recommendation: z.enum(['advance', 'hold', 'do_not_advance'], { message: 'Choose a recommendation' }),
  strengths: z.string().trim().max(2000),
  concerns: z.string().trim().max(2000),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const decisionSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(['selected', 'rejected']),
  reason: z.string().trim().min(1, 'Add a reason for this decision').max(2000),
  confirmNoFeedback: z.boolean(),
});
