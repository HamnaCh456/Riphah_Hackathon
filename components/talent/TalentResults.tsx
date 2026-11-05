import Link from "next/link";

import type { RankedCandidate } from "@/lib/talent/rank";

export function TalentResults({ results }: { results: RankedCandidate[] }) {
  return (
    <ol className="mt-4 border-b">
      {results.map((person) => (
        <li key={person.candidateId} className="border-t py-4">
          <Link
            href={`/recruiter/jobs/${person.jobId}/applicants/${person.applicationId}`}
            className="text-platinum underline-offset-4 hover:underline"
          >
            {person.fullName ?? "Name not found"}
          </Link>
          {person.evidence.map((item) => (
            <div key={item.facet} className="mt-3">
              <p className="text-sm">
                {item.facet}
                {item.note && <span className="text-mist"> · {item.note}</span>}
              </p>
              <blockquote className="mt-1 w-fit max-w-full whitespace-pre-line break-words bg-[var(--color-citrine)] px-1.5 py-0.5 text-sm text-abyss">
                {item.excerpt}
              </blockquote>
            </div>
          ))}
          {person.missingFacets.length > 0 && (
            <p className="mt-3 text-sm">
              No evidence found for: {person.missingFacets.join(", ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
