'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';

import type { ActionResult } from '@/components/matching/ActionForm';
import { requireCandidate } from '@/lib/auth/guards';
import { runAssessment } from '@/lib/matching/run';
import { recommendationsTagFor } from '@/lib/talent/recommend-cache';
import { getCurrentResume } from '@/lib/resume/service';
import { createClient } from '@/lib/supabase/server';

export async function applyAction(formData: FormData): Promise<ActionResult> {
  const jobId = z.string().uuid().safeParse(formData.get('jobId'));
  if (!jobId.success) return { ok: false, error: 'This job could not be found.' };
  const profile = await requireCandidate();

  const resume = await getCurrentResume(profile.id);
  if (!resume) return { ok: false, error: 'Upload your resume before applying.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('apply_to_job', {
    p_job_id: jobId.data,
    p_resume_id: resume.id,
  });
  if (error) {
    if (error.message.includes('already applied')) return { ok: true, message: 'You have already applied to this job' };
    if (error.message.includes('not open')) return { ok: false, error: 'This job is no longer open.' };
    console.error('Apply failed', error);
    return { ok: false, error: 'Could not send your application. Try again.' };
  }

  // Runs after the response, so the candidate never waits on the AI. A failure leaves the recruiter
  // a retry button on the applicant page and never affects the application itself.
  const applicationId = data as string;
  after(async () => {
    try {
      await runAssessment(applicationId);
    } catch (runError) {
      console.error('Assessment could not start', runError);
    }
  });

  updateTag(recommendationsTagFor(profile.id));
  revalidatePath('/candidate/applications');
  revalidatePath('/candidate/jobs');
  return { ok: true, message: 'Application sent' };
}
