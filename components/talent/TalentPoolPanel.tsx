"use client";

import { useTransition } from "react";

import {
  talentPoolAction,
  type TalentResult,
} from "@/app/recruiter/talent-search/actions";
import { Button } from "@/components/ui/button";
import { useSessionState } from "@/components/viewer";

import { TalentResults } from "./TalentResults";

export function TalentPoolPanel({ jobId }: { jobId: string }) {
  const [result, setResult] = useSessionState<TalentResult | null>(`talent-pool:${jobId}`, null);
  const [pending, startTransition] = useTransition();

  return (
    <section aria-label="Past applicants" className="card mt-5 p-5">
      <h2 className="text-lg">Past applicants who may suit this job</h2>
      <p className="mt-1 text-sm">
        Searches people you reviewed for your other jobs in the last 180 days
        who agreed to be considered again. Nobody is contacted or added
        automatically.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3"
        loading={pending}
        onClick={() =>
          startTransition(async () => setResult(await talentPoolAction(jobId)))
        }
      >
        {pending ? "Searching…" : "Find past applicants"}
      </Button>
      <div aria-live="polite">
        {result?.ok === false && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {result.message}
          </p>
        )}
        {result?.ok && result.results.length === 0 && (
          <p className="mt-3 text-sm">
            No past applicants match this job&apos;s requirements yet.
          </p>
        )}
        {result?.ok && result.results.length > 0 && (
          <TalentResults results={result.results} />
        )}
      </div>
    </section>
  );
}
