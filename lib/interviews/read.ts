// lib/interviews/read.ts
import 'server-only';
import { db } from '@/lib/db';

export type FeedbackValues = {
  technical_skill: number; problem_solving: number; communication: number; job_knowledge: number;
  recommendation: string; strengths: string; concerns: string;
};

export type InterviewRow = {
  id: string; type: string; status: 'scheduled' | 'completed' | 'cancelled'; starts_at: string; ends_at: string;
  interviewer_id: string; interviewers: { name: string };
  interview_feedback: FeedbackValues | FeedbackValues[] | null;
};

export const INTERVIEW_COLUMNS = `id, type, status, starts_at, ends_at, interviewer_id, interviewers(name),
  interview_feedback(technical_skill, problem_solving, communication, job_knowledge, recommendation, strengths, concerns)`;

export async function loadInterviewers(recruiterId: string) {
  const { data, error } = await db().from('interviewers').select('id, name').eq('recruiter_id', recruiterId).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function loadApplicationInterviews(applicationId: string) {
  const { data, error } = await db().from('interviews').select(INTERVIEW_COLUMNS)
    .eq('application_id', applicationId).order('starts_at');
  if (error) throw error;
  return (data ?? []) as unknown as InterviewRow[];
}
