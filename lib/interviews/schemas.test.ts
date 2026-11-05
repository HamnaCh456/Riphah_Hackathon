// lib/interviews/schemas.test.ts
import { describe, expect, it } from 'vitest';
import { decisionSchema, feedbackSchema, scheduleSchema } from '@/lib/interviews/schemas';

const schedule = {
  applicationId: '3f2b1c9e-8a4d-4f6b-9c1e-2d3a4b5c6d7e', interviewId: null,
  interviewerId: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  type: 'technical', date: '2026-11-10', time: '10:00', durationMinutes: 60, acknowledgeConflict: false,
};

describe('scheduleSchema', () => {
  it('accepts a complete form', () => {
    expect(scheduleSchema.safeParse(schedule).success).toBe(true);
  });
  it('rejects a duration not on the list', () => {
    expect(scheduleSchema.safeParse({ ...schedule, durationMinutes: 5000 }).success).toBe(false);
  });
  it('names the missing interviewer field', () => {
    const result = scheduleSchema.safeParse({ ...schedule, interviewerId: '' });
    expect(result.error?.issues[0].message).toBe('Choose an interviewer');
  });
});

const feedback = {
  interviewId: schedule.interviewerId, technical_skill: 4, problem_solving: 3, communication: 5,
  job_knowledge: 4, recommendation: 'advance', strengths: 'Clear API design', concerns: '',
};

describe('feedbackSchema', () => {
  it('accepts a complete form with empty optional text', () => {
    expect(feedbackSchema.safeParse(feedback).success).toBe(true);
  });
  it('rejects a rating outside 1 to 5', () => {
    expect(feedbackSchema.safeParse({ ...feedback, communication: 6 }).success).toBe(false);
  });
  it('requires a recommendation', () => {
    expect(feedbackSchema.safeParse({ ...feedback, recommendation: undefined }).success).toBe(false);
  });
});

describe('decisionSchema', () => {
  const decision = { applicationId: schedule.applicationId, decision: 'selected', reason: 'Strong on system design', confirmNoFeedback: false };
  it('accepts selected and rejected', () => {
    expect(decisionSchema.safeParse(decision).success).toBe(true);
    expect(decisionSchema.safeParse({ ...decision, decision: 'rejected' }).success).toBe(true);
  });
  it('rejects any other status', () => {
    expect(decisionSchema.safeParse({ ...decision, decision: 'shortlisted' }).success).toBe(false);
  });
  it('requires a reason', () => {
    expect(decisionSchema.safeParse({ ...decision, reason: '  ' }).error?.issues[0].message).toBe('Add a reason for this decision');
  });
});
