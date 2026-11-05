import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { MATCH_LABELS } from "@/components/matching/labels";
import { requireRecruiter } from "@/lib/auth/guards";
import type { ComparisonCell } from "@/lib/compare/build-comparison";
import { loadComparison, parseSelection } from "@/lib/compare/load-comparison";

export const metadata = { title: "Compare applicants | Talent Intelligence" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headCell =
  "sticky left-0 z-10 min-w-36 bg-abyss py-3 pr-4 text-left align-top text-sm font-normal";

function Cell({ cell }: { cell: ComparisonCell }) {
  return (
    <>
      <p className={`text-sm ${cell.status === "confirmed_absent" ? "text-coral" : "text-mist"}`}>
        {MATCH_LABELS[cell.status].word}
      </p>
      {cell.quotes.map((quote) => (
        <blockquote
          key={quote}
          className="mt-1 w-fit max-w-full break-words bg-[var(--color-citrine)] px-1.5 py-0.5 text-sm text-abyss"
        >
          {quote}
        </blockquote>
      ))}
      {cell.overrideReason && (
        <p className="mt-1 text-sm">Changed by recruiter: {cell.overrideReason}</p>
      )}
      {cell.needsReview && <p className="mt-1 text-sm">Needs manual check</p>}
    </>
  );
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ a?: string | string[] }>;
}) {
  const profile = await requireRecruiter();
  const { jobId } = await params;
  const { a } = await searchParams;
  const selection = parseSelection(a);
  const result = selection.every((id) => UUID.test(id))
    ? await loadComparison(jobId, profile.id, selection)
    : ({ ok: false, message: "One of these applicants was not found for this job." } as const);

  return (
    <AppShell profile={profile}>
      <nav aria-label="Breadcrumb" className="font-arial text-[13px]">
        <Link href={`/recruiter/jobs/${jobId}/applicants`} className="textlink">
          Back to applicants
        </Link>
      </nav>
      <h1 className="mt-1 text-2xl">Compare applicants</h1>
      {!result.ok && (
        <p role="alert" className="mt-4 text-sm text-coral">
          {result.message}
        </p>
      )}
      {result.ok && (
        <div
          className="mt-4 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Applicant comparison"
        >
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th scope="col" className={headCell}>
                  Requirement
                </th>
                {result.comparison.applicants.map((person) => (
                  <th
                    key={person.applicationId}
                    scope="col"
                    className="py-3 pr-4 text-left font-normal text-platinum"
                  >
                    <Link
                      href={`/recruiter/jobs/${jobId}/applicants/${person.applicationId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {person.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <th scope="row" className={headCell}>
                  Job-relevance score
                </th>
                {result.comparison.applicants.map((person) => (
                  <td key={person.applicationId} className="py-3 pr-4 align-top text-sm">
                    <span className="font-mono text-base tabular-nums text-lavender">
                      {person.score}
                    </span>
                    {person.ceiling > person.score && ` could reach ${person.ceiling}`}
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <th scope="row" className={headCell}>
                  Why this score
                </th>
                {result.comparison.applicants.map((person) => (
                  <td key={person.applicationId} className="py-3 pr-4 align-top text-sm">
                    {person.summary}
                  </td>
                ))}
              </tr>
              {result.comparison.rows.map((row) => (
                <tr key={row.key} className="border-t">
                  <th scope="row" className={headCell}>
                    {row.label}
                    <span className="block text-[13px]">
                      {row.isRequired ? "Required" : "Preferred"}
                    </span>
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={result.comparison.applicants[i].applicationId}
                      className="py-3 pr-4 align-top"
                    >
                      <Cell cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t">
                <th scope="row" className={headCell}>
                  Not mentioned
                </th>
                {result.comparison.applicants.map((person) => (
                  <td key={person.applicationId} className="py-3 pr-4 align-top text-sm">
                    {person.missing.length ? person.missing.join(", ") : "Nothing"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
