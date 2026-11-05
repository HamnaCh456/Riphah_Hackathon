import "server-only";

import { db } from "@/lib/db";
import type { ApplicationStatus } from "@/lib/pipeline/statuses";

export type OwnedApplication = {
  id: string;
  status: ApplicationStatus;
  candidateId: string;
  candidateName: string;
  resumeId: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
};

/** Null unless this recruiter owns the job the application belongs to. */
export async function getOwnedApplication(
  applicationId: string,
  recruiterId: string,
): Promise<OwnedApplication | null> {
  const { data, error } = await db()
    .from("applications")
    .select(
      "id, status, candidate_id, resume_id, job:jobs!inner(id, title, description, recruiter_id), candidate:profiles!applications_candidate_id_fkey(full_name)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const job = data.job as unknown as {
    id: string;
    title: string;
    description: string;
    recruiter_id: string;
  };
  if (job.recruiter_id !== recruiterId) return null;
  const candidate = data.candidate as unknown as { full_name: string } | null;

  return {
    id: data.id,
    status: data.status,
    candidateId: data.candidate_id,
    candidateName: candidate?.full_name ?? "Unnamed candidate",
    resumeId: data.resume_id,
    jobId: job.id,
    jobTitle: job.title,
    jobDescription: job.description,
  };
}
