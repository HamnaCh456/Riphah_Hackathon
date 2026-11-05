import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { orderedPair } from "./decide-logic";
import { findDuplicatePairs, type DuplicateRecord } from "./detect";

export type ApplicantRow = {
  id: string;
  status: string;
  job_id: string;
  candidate_id: string;
  job: { title: string };
  person: {
    full_name: string | null;
    email: string | null;
    merged_into: string | null;
  } | null;
  resume: { raw_text: string; parsed: { email?: string; phone?: string } | null } | null;
};

/** Possible duplicates among this recruiter's applicants that nobody has decided on yet. */
export async function loadDuplicates(db: SupabaseClient, recruiterId: string) {
  // The secret key bypasses database rules, so this is limited to the recruiter's own jobs here.
  const { data, error } = await db
    .from("applications")
    .select(
      "id, status, job_id, candidate_id, job:jobs!inner(title, recruiter_id), person:profiles(full_name, email, merged_into), resume:resumes(raw_text, parsed)",
    )
    .eq("job.recruiter_id", recruiterId);
  if (error) throw error;
  const rows = data as unknown as ApplicantRow[];

  const records = new Map<string, DuplicateRecord>();
  for (const row of rows) {
    if (row.person?.merged_into) continue;
    const record = records.get(row.candidate_id) ?? {
      candidateId: row.candidate_id,
      name: row.person?.full_name ?? "Name not found",
      emails: row.person?.email ? [row.person.email] : [],
      phones: [],
      resumeText: "",
    };
    if (row.resume?.parsed?.email) record.emails.push(row.resume.parsed.email);
    if (row.resume?.parsed?.phone) record.phones.push(row.resume.parsed.phone);
    if (row.resume?.raw_text && !record.resumeText) record.resumeText = row.resume.raw_text;
    records.set(row.candidate_id, record);
  }

  const { data: decisions, error: decisionError } = await db
    .from("duplicate_decisions")
    .select("candidate_a, candidate_b");
  if (decisionError) throw decisionError;
  const decided = new Set(decisions.map((d) => `${d.candidate_a}|${d.candidate_b}`));

  const pairs = findDuplicatePairs([...records.values()]).filter(
    (pair) =>
      !decided.has(orderedPair(pair.a.candidateId, pair.b.candidateId).join("|")),
  );
  return { rows, pairs };
}
