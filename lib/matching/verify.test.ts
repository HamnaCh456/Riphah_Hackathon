import { describe, expect, it } from 'vitest';
import { verifyRequirement } from './verify';
import type { LlmResult, Requirement, RetrievedChunk } from './types';

const req: Requirement = { key: 'k1', component: 'skill', label: 'Docker', importance: 3, isRequired: true };
const chunks: RetrievedChunk[] = [
  { id: 'exp', section: 'experience', content: 'Shipped services in Docker containers\nto ECS.', similarity: 0.8 },
  { id: 'skl', section: 'skills', content: 'Python, Docker', similarity: 0.7 },
  { id: 'neg', section: 'summary', content: 'I have no hands-on Docker experience yet.', similarity: 0.6 },
];
const llm = (o: Partial<LlmResult>): LlmResult =>
  ({ key: 'k1', status: 'matched', evidence: [], explanation: 'x', learning_suggestion: null, ...o });

describe('verifyRequirement', () => {
  it('accepts a real quote despite spacing, case and curly punctuation', () => {
    const out = verifyRequirement(req, llm({ evidence: [{ chunk_id: 'exp', quote: 'shipped SERVICES in docker containers to ECS.' }] }), chunks);
    expect(out).toMatchObject({ status: 'matched', depth: 'demonstrated', needsReview: false });
    expect(out.evidence[0]).toMatchObject({ verified: true, similarity: 0.8 });
  });

  it('downgrades a claim whose quote is not in the resume and flags it', () => {
    const out = verifyRequirement(req, llm({ evidence: [{ chunk_id: 'exp', quote: 'Led a Kubernetes migration' }] }), chunks);
    expect(out).toMatchObject({ status: 'no_evidence', depth: null, needsReview: true });
    expect(out.evidence[0].verified).toBe(false);
  });

  it('rejects a quote cited from a chunk it did not retrieve', () => {
    const out = verifyRequirement(req, llm({ evidence: [{ chunk_id: 'other', quote: 'Python, Docker' }] }), chunks);
    expect(out).toMatchObject({ status: 'no_evidence', needsReview: true });
  });

  it('marks skills-list-only evidence as listed', () => {
    const out = verifyRequirement(req, llm({ evidence: [{ chunk_id: 'skl', quote: 'Docker' }] }), chunks);
    expect(out).toMatchObject({ status: 'matched', depth: 'listed' });
  });

  it('keeps confirmed_absent only with a verified quote', () => {
    const ok = verifyRequirement(req, llm({ status: 'confirmed_absent', evidence: [{ chunk_id: 'neg', quote: 'no hands-on Docker experience' }] }), chunks);
    expect(ok.status).toBe('confirmed_absent');
    const inferred = verifyRequirement(req, llm({ status: 'confirmed_absent', evidence: [] }), chunks);
    expect(inferred).toMatchObject({ status: 'no_evidence', needsReview: true });
  });

  it('keeps honest no_evidence without flagging it', () => {
    const out = verifyRequirement(req, llm({ status: 'no_evidence' }), chunks);
    expect(out).toMatchObject({ status: 'no_evidence', needsReview: false, topSimilarity: 0.8 });
  });

  it('flags a requirement the AI skipped', () => {
    expect(verifyRequirement(req, undefined, chunks)).toMatchObject({ status: 'no_evidence', needsReview: true });
  });

  it('flags a mix of real and invented quotes but keeps the real one', () => {
    const out = verifyRequirement(req, llm({ evidence: [
      { chunk_id: 'exp', quote: 'Docker containers' }, { chunk_id: 'exp', quote: 'Invented' },
    ] }), chunks);
    expect(out).toMatchObject({ status: 'matched', needsReview: true });
  });
});
