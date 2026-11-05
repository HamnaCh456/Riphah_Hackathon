import 'server-only';
import { embedTexts, generateJson } from '@/lib/ai/gemini';
import { db } from '@/lib/db';
import { checkSupport } from '@/lib/trust/support-check';
import { geminiSupportJudge } from '@/lib/trust/support-judge';
import { chunkResume } from './chunk';
import { ASSESSMENT_SYSTEM_PROMPT, assessmentOutput, assessmentResponseSchema, buildPrompt } from './prompt';
import { redact } from './redact';
import { buildRequirements, inputHash } from './requirements';
import { computeScore } from './score';
import type { Requirement, RetrievedChunk, Section } from './types';
import { normalizeForMatch, verifyRequirement } from './verify';

export const TOP_K = 5;
// generateJson may fall back to another model, so this doesn't name just one.
const ASSESS_MODEL = 'gemini-flash-or-gpt-4o-mini';
const RUNNING_EXPIRES_MS = 120_000;
const AI_RETRY_DELAYS_MS = [3_000, 8_000];
const UNIQUE_VIOLATION = '23505';
const SEARCHABLE: Section[] = ['summary', 'skills', 'experience', 'project', 'education', 'certification', 'other'];

type Admin = ReturnType<typeof db>;

export function sectionsFor(req: Pick<Requirement, 'component'>): Section[] {
  if (req.component === 'project') return ['project', 'experience', 'other'];
  if (req.component === 'qualification') return ['education', 'certification', 'summary', 'other'];
  return SEARCHABLE;
}

/** Splits, redacts and embeds a resume once. Does nothing if its chunks already exist. */
export async function ensureChunks(admin: Admin, resumeId: string, raw: string, name: string | null): Promise<void> {
  const existing = await admin.from('resume_chunks').select('id').eq('resume_id', resumeId).limit(1);
  if (existing.error) throw existing.error;
  if (existing.data.length > 0) return;

  // Redaction can empty a chunk (a lone "Marital Status" line), and an empty text can't be embedded.
  const chunks = chunkResume(raw)
    .map((c) => ({ ...c, content: redact(c.content, name).trim() }))
    .filter((c) => c.content);
  if (chunks.length === 0) return;
  const vectors = await embedTexts(chunks.map((c) => c.content), 'RETRIEVAL_DOCUMENT');
  const { error } = await admin.from('resume_chunks').insert(chunks.map((c, i) => ({
    resume_id: resumeId,
    section: c.section,
    ordinal: c.ordinal,
    content: c.content,
    start_offset: c.startOffset,
    embedding: JSON.stringify(vectors[i]),
  })));
  if (error) throw error;
}

async function retrieve(admin: Admin, resumeId: string, req: Requirement, vector: number[]): Promise<RetrievedChunk[]> {
  const sections = sectionsFor(req);
  const { data, error } = await admin.rpc('match_resume_chunks', {
    p_resume_id: resumeId, p_embedding: JSON.stringify(vector), p_sections: sections, p_k: TOP_K,
  });
  if (error) throw error;
  const found: RetrievedChunk[] = data ?? [];

  // Semantic search can miss a bare term in a long list, so literal mentions are always included.
  const literal = await admin.from('resume_chunks').select('id, section, content')
    .eq('resume_id', resumeId).in('section', sections);
  if (literal.error) throw literal.error;
  const term = normalizeForMatch(req.label);
  for (const row of literal.data) {
    if (normalizeForMatch(row.content).includes(term) && !found.some((c) => c.id === row.id)) {
      found.push({ ...row, section: row.section as Section, similarity: 0 });
    }
  }
  return found;
}

async function advance(admin: Admin, applicationId: string, to: 'parsed' | 'assessed'): Promise<void> {
  // Returns false when a recruiter has already moved the application on, which is not an error.
  const { error } = await admin.rpc('system_advance_application', { p_application_id: applicationId, p_to: to });
  if (error) throw error;
}

export type RunResult = {
  state: 'complete' | 'running' | 'failed' | 'skipped';
  assessmentId?: string;
  message?: string;
};

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
};

// Gemini returns 503 during demand spikes that usually pass in seconds, so wait before trying again.
async function askForAssessment(prompt: string) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return assessmentOutput.parse(await generateJson({
        system: ASSESSMENT_SYSTEM_PROMPT,
        prompt,
        responseSchema: assessmentResponseSchema,
      }));
    } catch (error) {
      if (attempt >= AI_RETRY_DELAYS_MS.length) throw error;
      await new Promise((done) => setTimeout(done, AI_RETRY_DELAYS_MS[attempt]));
    }
  }
}

async function assess(applicationId: string, options: { retry?: boolean }): Promise<RunResult> {
  const admin = db();

  const app = await admin.from('applications')
    .select('id, status, job_id, resume:resumes(id, raw_text, parse_status, parsed), job:jobs(title)')
    .eq('id', applicationId).single();
  if (app.error) throw app.error;
  const resume = app.data.resume as unknown as {
    id: string; raw_text: string; parse_status: string; parsed: { name?: string } | null;
  };
  const job = app.data.job as unknown as { title: string };

  if (resume.parse_status !== 'parsed' || !resume.raw_text?.trim()) {
    return { state: 'skipped', message: 'The resume could not be read, so it needs a manual review.' };
  }
  await advance(admin, applicationId, 'parsed');

  const rows = await admin.from('job_requirements')
    .select('id, kind, label, importance, is_required').eq('job_id', app.data.job_id);
  if (rows.error) throw rows.error;
  const requirements = buildRequirements(job.title, rows.data);
  if (requirements.length === 0) {
    return { state: 'skipped', message: 'This job has no requirements to compare against.' };
  }

  const hash = inputHash(requirements, resume.raw_text);
  const existing = await admin.from('assessments').select('id, status, started_at')
    .eq('application_id', applicationId).eq('input_hash', hash).maybeSingle();
  if (existing.error) throw existing.error;

  let assessmentId: string;
  if (existing.data) {
    const { id, status, started_at: startedAt } = existing.data;
    if (status === 'complete') {
      await advance(admin, applicationId, 'assessed');
      return { state: 'complete', assessmentId: id };
    }
    const expired = Date.now() - new Date(startedAt).getTime() > RUNNING_EXPIRES_MS;
    if (status === 'running' && !expired) return { state: 'running', assessmentId: id };
    if (status === 'failed' && !options.retry) return { state: 'failed', assessmentId: id };
    const reset = await admin.from('assessments')
      .update({ status: 'running', error: null, started_at: new Date().toISOString() }).eq('id', id);
    if (reset.error) throw reset.error;
    const cleared = await admin.from('assessment_requirements').delete().eq('assessment_id', id);
    if (cleared.error) throw cleared.error;
    assessmentId = id;
  } else {
    const inserted = await admin.from('assessments')
      .insert({ application_id: applicationId, input_hash: hash, status: 'running', model: ASSESS_MODEL })
      .select('id').single();
    if (inserted.error) {
      if (inserted.error.code === UNIQUE_VIOLATION) return { state: 'running' }; // Another request claimed it first.
      throw inserted.error;
    }
    assessmentId = inserted.data.id;
  }

  try {
    await ensureChunks(admin, resume.id, resume.raw_text, resume.parsed?.name ?? null);
    const vectors = await embedTexts(requirements.map((r) => `${r.label} (${job.title})`), 'RETRIEVAL_QUERY');
    const items = await Promise.all(requirements.map(async (requirement, i) => ({
      requirement,
      chunks: await retrieve(admin, resume.id, requirement, vectors[i]),
    })));

    const output = await askForAssessment(buildPrompt(job.title, items));
    const assessed = await checkSupport(items.map(({ requirement, chunks }) =>
      verifyRequirement(requirement, output.results.find((r) => r.key === requirement.key), chunks)), geminiSupportJudge);
    const { score, ceiling } = computeScore(assessed);

    for (const item of assessed) {
      const saved = await admin.from('assessment_requirements').insert({
        assessment_id: assessmentId,
        requirement_key: item.key,
        component: item.component,
        label: item.label,
        importance: item.importance,
        is_required: item.isRequired,
        status: item.status,
        depth: item.depth,
        explanation: item.explanation,
        learning_suggestion: item.learningSuggestion,
        needs_review: item.needsReview,
        review_reason: item.reviewReason,
        top_similarity: item.topSimilarity,
      }).select('id').single();
      if (saved.error) throw saved.error;
      if (item.evidence.length > 0) {
        const evidence = await admin.from('assessment_evidence').insert(item.evidence.map((e) => ({
          assessment_requirement_id: saved.data.id,
          chunk_id: e.chunkId,
          quote: e.quote,
          section: e.section,
          verified: e.verified,
          similarity: e.similarity,
        })));
        if (evidence.error) throw evidence.error;
      }
    }

    // Set last, because screens read complete assessments only.
    const done = await admin.from('assessments')
      .update({ status: 'complete', score, ceiling, completed_at: new Date().toISOString() }).eq('id', assessmentId);
    if (done.error) throw done.error;
    await advance(admin, applicationId, 'assessed');
    return { state: 'complete', assessmentId };
  } catch (error) {
    const message = messageOf(error);
    console.error('Assessment failed', applicationId, error);
    await admin.from('assessments').update({ status: 'failed', error: message }).eq('id', assessmentId);
    return { state: 'failed', assessmentId, message };
  }
}

/**
 * Assesses one application. Safe to call from a server action after a candidate applies: it never
 * throws, so a failure here cannot undo the application. A failure stores a failed assessment and
 * no score. Pass retry to run a failed assessment again.
 */
export async function runAssessment(applicationId: string, options: { retry?: boolean } = {}): Promise<RunResult> {
  try {
    return await assess(applicationId, options);
  } catch (error) {
    console.error('Assessment could not start', applicationId, error);
    return { state: 'failed', message: messageOf(error) };
  }
}
