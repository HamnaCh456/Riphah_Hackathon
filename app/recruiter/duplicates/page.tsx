import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ActionForm } from "@/components/matching/ActionForm";
import { STATUS_LABELS } from "@/components/matching/labels";
import { Button } from "@/components/ui/button";
import { requireRecruiter } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { DuplicateRecord } from "@/lib/duplicates/detect";
import { loadDuplicates } from "@/lib/duplicates/load";

import { decideDuplicateAction } from "./actions";

export const metadata = { title: "Possible duplicates | Talent Intelligence" };

export default async function DuplicatesPage() {
  const profile = await requireRecruiter();
  const { rows, pairs } = await loadDuplicates(db(), profile.id);

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
      <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input type="radio" name="keep" value={record.candidateId} />
        Keep this record
      </label>
    </div>
  );

  return (
    <AppShell profile={profile}>
      <div className="max-w-4xl">
        <h1 className="text-2xl">Possible duplicates</h1>
        <p className="mt-2 text-sm">
          Applicants to your jobs who may be the same person. Nothing merges
          unless you approve it here.
        </p>
        {pairs.length === 0 ? (
          <p className="mt-6 border-t pt-4 text-sm">No possible duplicates to review.</p>
        ) : (
          <ul className="mt-6 border-b">
            {pairs.map((pair) => (
              <li
                key={`${pair.a.candidateId}-${pair.b.candidateId}`}
                className="border-t py-5"
              >
                <p className="text-sm text-mist">Why flagged: {pair.reasons.join(" · ")}</p>
                <ActionForm action={decideDuplicateAction}>
                  <input type="hidden" name="first" value={pair.a.candidateId} />
                  <input type="hidden" name="second" value={pair.b.candidateId} />
                  <div className="mt-3 grid gap-6 sm:grid-cols-2">
                    {person(pair.a)}
                    {person(pair.b)}
                  </div>
                  <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" name="confirmed" />
                    I checked and these are the same person
                  </label>
                  <p className="text-sm">
                    Merging shows both records as one person in your searches.
                    Applications stay as they are, and each account keeps its own
                    history.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" name="action" value="merge">
                      Merge records
                    </Button>
                    <Button variant="ghost" size="sm" name="action" value="dismiss">
                      Not a duplicate
                    </Button>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
