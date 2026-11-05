import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";
import type { RequirementKind } from "./schema";

export type JobStatus = "open" | "closed";

export type JobListItem = {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  status: JobStatus;
  createdAt: string;
  applicantCount: number;
};

export type JobRequirement = {
  id: string;
  kind: RequirementKind;
  label: string;
  importance: number;
  isRequired: boolean;
};

export type JobDetail = {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  salary: string | null;
  description: string;
  status: JobStatus;
  requirements: JobRequirement[];
};

/** Only this recruiter's jobs. */
export async function listJobs(recruiterId: string): Promise<JobListItem[]> {
  const { data, error } = await db()
    .from("jobs")
    .select(
      "id, title, department, location, employment_type, status, created_at, applications(count)",
    )
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load jobs: ${error.message}`);

  return data.map((job) => ({
    id: job.id,
    title: job.title,
    department: job.department,
    location: job.location,
    employmentType: job.employment_type,
    status: job.status,
    createdAt: job.created_at,
    applicantCount:
      (job.applications as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

/** Null unless the job exists and belongs to this recruiter. */
export async function getOwnedJob(
  jobId: string,
  recruiterId: string,
): Promise<JobDetail | null> {
  if (!z.string().uuid().safeParse(jobId).success) return null;

  const { data, error } = await db()
    .from("jobs")
    .select(
      "id, title, department, location, employment_type, salary, description, status, job_requirements(id, kind, label, importance, is_required, created_at)",
    )
    .eq("id", jobId)
    .eq("recruiter_id", recruiterId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the job: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    department: data.department,
    location: data.location,
    employmentType: data.employment_type,
    salary: data.salary,
    description: data.description,
    status: data.status,
    requirements: [...data.job_requirements]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((requirement) => ({
        id: requirement.id,
        kind: requirement.kind,
        label: requirement.label,
        importance: requirement.importance,
        isRequired: requirement.is_required,
      })),
  };
}
