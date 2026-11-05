import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { STATUS_LABELS } from "@/components/matching/labels";
import { requireRecruiter } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { findDuplicatePairs, type DuplicateRecord } from "@/lib/duplicates/detect";

export const metadata = { title: "Possible duplicates | Talent Intelligence" };

type Row = {
  id: string;
  status: string;
  job_id: string;
  candidate_id: string;
  job: { title: string };
  person: { full_name: string | null; email: string | null } | null;
  resume: { raw_text: string; parsed: { email?: string; phone?: string } | null } | null;
};

export default async function DuplicatesPage() {
  const profile = await requireRecruiter();
  // The secret key bypasses database rules, so this is limited to the recruiter's own jobs here.
  const { data, error } = await db()
    .from("applications")
    .select(
      "id, status, job_id, candidate_id, job:jobs!inner(title, recruiter_id), person:profiles(full_name, email), resume:resumes(raw_text, parsed)",
    )
    .eq("job.recruiter_id", profile.id);
  if (error) throw new Error("Could not load applicants");
  const rows = data as unknown as Row[];

  const records = new Map<string, DuplicateRecord>();
  for (const row of rows) {
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
  const pairs = findDuplicatePairs([...records.values()]);

  const person = (record: DuplicateRecord) => (
    <div className="min-w-0 break-words">
      <p className="text-platinum">{record.name}</p>
      <p className="text-sm">{[...new Set(record.emails)].join(", ") || "No email on file"}</p>
      <p className="text-sm">{[...new Set(record.phones)].join(", ") || "No phone on file"}</p>
      <ul className="mt-2 text-sm">
        {rows
          .filter((row) => row.candidate_id === record.candidateId)
          .map((row) => (
            <li key={row.id}>
              <Link
                href={`/recruiter/jobs/${row.job_id}/applicants/${row.id}`}
                className="textlink"
              >
                {row.job.title}
              </Link>
              : {STATUS_LABELS[row.status] ?? row.status}
            </li>
          ))}
      </ul>
    </div>
  );

  return (
    <AppShell profile={profile}>
      <div className="max-w-4xl">
        <h1 className="text-2xl">Possible duplicates</h1>
        <p className="mt-2 text-sm">
          Applicants to your jobs who may be the same person. This is for your
          review only, and nothing is merged or changed.
        </p>
        {pairs.length === 0 ? (
          <p className="mt-6 border-t pt-4 text-sm">No possible duplicates found.</p>
        ) : (
          <ul className="mt-6 border-b">
            {pairs.map((pair) => (
              <li
                key={`${pair.a.candidateId}-${pair.b.candidateId}`}
                className="border-t py-5"
              >
                <p className="text-sm text-mist">Why flagged: {pair.reasons.join(" · ")}</p>
                <div className="mt-3 grid gap-6 sm:grid-cols-2">
                  {person(pair.a)}
                  {person(pair.b)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
