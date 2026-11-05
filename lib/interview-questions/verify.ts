// lib/interview-questions/verify.ts
import { excerptAppearsIn } from '@/lib/ai/verify-excerpt';
import type { GeneratedQuestion, ProjectEvidence, QuestionDraft } from './schema';

// A short quote like "API" would match almost any excerpt and prove nothing.
const MIN_QUOTE_LENGTH = 8;

export function verifyQuestion(q: GeneratedQuestion, projects: ProjectEvidence[]): QuestionDraft {
  const common = {
    kind: q.kind, difficulty: q.difficulty, skill: q.skill,
    question: q.question, answer_guidelines: q.answer_guidelines,
  };

  if (q.kind === 'role') {
    return { ...common, evidence_id: null, evidence_quote: null, support: 'not_applicable' };
  }

  const project = projects.find((p) => p.id === q.evidence_id);
  if (!project) {
    return { ...common, evidence_id: null, evidence_quote: q.evidence_quote, support: 'needs_review' };
  }

  const quote = q.evidence_quote?.trim() ?? '';
  const found = quote.length >= MIN_QUOTE_LENGTH && excerptAppearsIn(quote, project.excerpt);

  return {
    ...common,
    evidence_id: project.id,
    evidence_quote: q.evidence_quote,
    support: found ? 'verified' : 'needs_review',
  };
}
