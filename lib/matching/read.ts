import 'server-only';

import { getOwnedApplication } from '@/lib/auth/ownership';
import { db } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { applyOverrides, type OverrideRow, type StoredRequirement } from './effective';
import { recommendation, summarize } from './explain';
import type { ApplicantRow } from './filters';

export type AssessmentState = 'complete' | 'running' | 'failed' | 'none';

export interface EvidenceRecord {
  id: string;
  quote: string;
  section: string | null;
  verified: boolean;
  similarity: number | null;
}

export type RequirementRecord = StoredRequirement & {
  id: string;
  explanation: string;
  learning_suggestion: string | null;
  needs_review: boolean;
  review_reason: string | null;
  assessment_evidence: EvidenceRecord[];
};

type ListRequirement = StoredRequirement & { needs_review: boolean };

export interface NoteRecord { id: string; body: string; created_at: string }

export interface SkillCorrectionRecord {
  action: 'add' | 'remove' | 'rename';
  skill_name: string;
  new_name: string | null;
  reason: string;
  created_at: string;
}

interface AssessmentBase { status: Exclude<AssessmentState, 'none'>; started_at: string; error?: string | null }

// Same limit as runAssessment: a row still "running" after this means the process died, and a retry
// is allowed to take it over. Without this the recruiter would wait on a spinner forever.
const RUNNING_EXPIRES_MS = 120_000;

function newest<T extends { started_at: string }>(rows: T[]): T | undefined {
  return [...rows].sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
}

function stateOf(latest: AssessmentBase | undefined): AssessmentState {
  if (!latest) return 'none';
  if (latest.status === 'running'
    && Date.now() - new Date(latest.started_at).getTime() > RUNNING_EXPIRES_MS) return 'failed';
  return latest.status;
}

type Review = { pinned: boolean } | { pinned: boolean }[] | null;
const pinnedOf = (review: Review) =>
  (Array.isArray(review) ? review[0]?.pinned : review?.pinned) ?? false;

interface ApplicantListRow {
  id: string;
  candidate_id: string;
  status: string;
  created_at: string;
  application_review: Review;
  requirement_overrides: OverrideRow[];
  assessments: (AssessmentBase & { assessment_requirements: ListRequirement[] })[];
}

/** Applications come through RLS, so only this recruiter's applicants are ever returned. */
export async function loadApplicants(jobId: string): Promise<ApplicantRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('applications').select(`
    id, candidate_id, status, created_at,
    application_review(pinned),
    requirement_overrides(requirement_key, status, reason, created_at),
    assessments(status, started_at, assessment_requirements(
      requirement_key, component, label, importance, is_required, status, depth, needs_review
    ))
  `).eq('job_id', jobId);
  if (error) throw new Error(`Could not load applicants: ${error.message}`);
  const rows = data as unknown as ApplicantListRow[];

  // Recruiters can't read other people's profiles through RLS. The ids here came from the RLS read
  // above, so this secret-key lookup can only return people who applied to this recruiter's job.
  const names = new Map<string, string>();
  if (rows.length > 0) {
    const profiles = await db().from('profiles').select('id, full_name')
      .in('id', rows.map((r) => r.candidate_id));
    if (profiles.error) throw new Error(`Could not load applicant names: ${profiles.error.message}`);
    for (const p of profiles.data) names.set(p.id, p.full_name);
  }

  return rows.map((a): ApplicantRow => {
    const latest = newest(a.assessments);
    const state = stateOf(latest);
    const base = {
      applicationId: a.id,
      name: names.get(a.candidate_id) ?? 'Unnamed candidate',
      status: a.status,
      appliedAt: a.created_at,
      pinned: pinnedOf(a.application_review),
    };
    if (state !== 'complete' || !latest) {
      return { ...base, score: null, ceiling: null, assessmentState: state,
        backedSkills: [], requiredGaps: 0, needsReview: false };
    }
    const effective = applyOverrides<ListRequirement>(latest.assessment_requirements, a.requirement_overrides);
    return {
      ...base,
      score: effective.score,
      ceiling: effective.ceiling,
      assessmentState: 'complete',
      backedSkills: effective.requirements
        .filter((r) => r.component === 'skill' && r.effectiveStatus === 'matched').map((r) => r.label),
      requiredGaps: effective.requirements
        .filter((r) => r.is_required && r.component === 'skill' && r.effectiveStatus !== 'matched').length,
      needsReview: effective.requirements.some((r) => r.needs_review && !r.overrideReason),
    };
  });
}

/**
 * The score and "could reach" for a candidate's own applications, and nothing else from the assessment.
 * Candidates can't read assessments through RLS, so the secret key is limited to their own id here.
 */
export async function loadMyScores(candidateId: string) {
  const { data, error } = await db().from('applications').select(`
    id,
    requirement_overrides(requirement_key, status, reason, created_at),
    assessments(status, started_at, assessment_requirements(
      requirement_key, component, label, importance, is_required, status, depth
    ))
  `).eq('candidate_id', candidateId);
  if (error) throw new Error(`Could not load your scores: ${error.message}`);

  const scores = new Map<string, { score: number; ceiling: number }>();
  for (const application of data as unknown as {
    id: string;
    requirement_overrides: OverrideRow[];
    assessments: (AssessmentBase & { assessment_requirements: StoredRequirement[] })[];
  }[]) {
    const latest = newest(application.assessments);
    if (!latest || stateOf(latest) !== 'complete') continue;
    const { score, ceiling } = applyOverrides<StoredRequirement>(
      latest.assessment_requirements,
      application.requirement_overrides,
    );
    scores.set(application.id, { score, ceiling });
  }
  return scores;
}

interface ApplicationDetailRow {
  id: string;
  resume_id: string;
  created_at: string;
  resume: { parse_status: string } | null;
  application_review: Review;
  requirement_overrides: OverrideRow[];
  skill_corrections: SkillCorrectionRecord[];
  application_notes: NoteRecord[];
  assessments: (AssessmentBase & { assessment_requirements: RequirementRecord[] })[];
}

/** Null unless this recruiter owns the job the application belongs to. */
export async function loadApplication(applicationId: string, recruiterId: string) {
  const owned = await getOwnedApplication(applicationId, recruiterId);
  if (!owned) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from('applications').select(`
    id, resume_id, created_at,
    resume:resumes(parse_status),
    application_review(pinned),
    requirement_overrides(requirement_key, status, reason, created_at),
    skill_corrections(action, skill_name, new_name, reason, created_at),
    application_notes(id, body, created_at),
    assessments(status, error, started_at, assessment_requirements(
      id, requirement_key, component, label, importance, is_required, status, depth,
      explanation, learning_suggestion, needs_review, review_reason,
      assessment_evidence(id, quote, section, verified, similarity)
    ))
  `).eq('id', applicationId).maybeSingle();
  if (error) throw new Error(`Could not load the application: ${error.message}`);
  if (!data) return null;
  const app = data as unknown as ApplicationDetailRow;

  const skills = await supabase.from('candidate_skills')
    .select('name, excerpt, verified').eq('resume_id', app.resume_id);
  if (skills.error) throw new Error(`Could not load the skills: ${skills.error.message}`);

  const latest = newest(app.assessments);
  const state = stateOf(latest);
  const complete = state === 'complete' && latest
    ? applyOverrides<RequirementRecord>(latest.assessment_requirements, app.requirement_overrides)
    : null;
  const items = complete?.requirements.map((r) => ({
    label: r.label, status: r.effectiveStatus, component: r.component, isRequired: r.is_required,
  })) ?? [];
  const stalled = latest?.status === 'running' && state === 'failed';

  return {
    owned,
    pinned: pinnedOf(app.application_review),
    resumeReadable: app.resume?.parse_status === 'parsed',
    notes: app.application_notes,
    corrections: [...app.skill_corrections].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    // An excerpt that wasn't found in the resume text is never shown as a resume quote.
    extractedSkills: skills.data.map((s) => ({ name: s.name, excerpt: s.verified ? s.excerpt : null })),
    assessmentState: state,
    assessmentError: stalled ? 'The assessment stopped before it finished.' : latest?.error ?? null,
    result: complete,
    summary: complete ? summarize(complete.score, complete.ceiling, items) : null,
    recommendation: complete ? recommendation(complete.score, complete.ceiling) : null,
  };
}
