// lib/interview-questions/projects.ts
import { redact } from '@/lib/matching/redact';
import type { ProjectEvidence } from './schema';

/** Project chunks with personal details removed. This is the only resume text the model sees. */
export function toProjectEvidence(
  chunks: { id: string; content: string }[],
  candidateName: string,
): ProjectEvidence[] {
  return chunks.map((chunk) => {
    const excerpt = redact(chunk.content, candidateName).trim();
    return { id: chunk.id, label: excerpt.split('\n')[0].trim(), excerpt };
  });
}
