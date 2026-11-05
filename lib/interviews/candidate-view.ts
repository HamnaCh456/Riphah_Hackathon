// lib/interviews/candidate-view.ts
import 'server-only';
import { db } from '@/lib/db';

export async function getCandidateInterviews(candidateId: string) {
  const { data, error } = await db().from('interviews')
    .select('application_id, type, status, starts_at, ends_at')
    .eq('candidate_id', candidateId).order('starts_at');
  if (error) throw error;
  return data ?? [];
}

export async function getCandidateNotifications(candidateId: string) {
  const { data, error } = await db().from('notifications')
    .select('id, title, body, created_at')
    .eq('user_id', candidateId).order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return data ?? [];
}
