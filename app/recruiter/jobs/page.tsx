import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { JobStatusButton } from "@/components/jobs/job-status-button";
import { Button } from "@/components/ui/button";
import { requireRecruiter } from "@/lib/auth/guards";
import { listJobs, type JobListItem } from "@/lib/jobs/queries";
import { EMPLOYMENT_TYPES } from "@/lib/jobs/schema";
import { cn } from "@/lib/utils";

export const metadata = { title: "Jobs | Talent Intelligence" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

const typeLabel = (value: string) =>
  EMPLOYMENT_TYPES.find((type) => type.value === value)?.label ?? value;

const postedDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireRecruiter();
  const jobs = await listJobs(profile.id);

  const { status } = await searchParams;
  const filter = status === "open" || status === "closed" ? status : "all";
  const shown = filter === "all" ? jobs : jobs.filter((job) => job.status === filter);

  return (
    <AppShell profile={profile}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl">Jobs</h1>
          {jobs.length > 0 && (
            <nav aria-label="Filter jobs by status" className="flex gap-1 font-arial text-sm">
              {FILTERS.map((option) => {
                const count =
                  option.value === "all"
                    ? jobs.length
                    : jobs.filter((job) => job.status === option.value).length;
                return (
                  <Link
                    key={option.value}
                    href={option.value === "all" ? "/recruiter/jobs" : `/recruiter/jobs?status=${option.value}`}
                    aria-current={filter === option.value ? "page" : undefined}
                    className={cn(
                      "rounded-small px-2.5 py-1.5 transition-colors hover:bg-wash hover:text-platinum",
                      filter === option.value && "bg-kelp text-platinum",
                    )}
                  >
                    {option.label} <span className="tabular-nums">{count}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <Button asChild size="sm">
          <Link href="/recruiter/jobs/new">New job</Link>
        </Button>
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 border-t pt-4 text-sm">
          {jobs.length === 0
            ? "No jobs yet. Post your first job to start receiving applicants."
            : `No ${filter} jobs.`}
        </p>
      ) : (
        <JobsTable jobs={shown} />
      )}
    </AppShell>
  );
}

function JobsTable({ jobs }: { jobs: JobListItem[] }) {
  return (
    <table className="mt-5 w-full border-collapse text-sm max-md:block">
      <thead className="max-md:hidden">
        <tr className="border-b border-hairline-soft text-left font-mono text-[10px] uppercase tracking-[.16em]">
          <th scope="col" className="py-2 pr-4 font-normal">Job</th>
          <th scope="col" className="py-2 pr-4 font-normal">Type</th>
          <th scope="col" className="py-2 pr-4 font-normal">Status</th>
          <th scope="col" className="py-2 pr-4 text-right font-normal">Applicants</th>
          <th scope="col" className="py-2 pr-4 font-normal">Posted</th>
          <th scope="col" className="py-2 font-normal"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody className="max-md:block">
        {jobs.map((job) => (
          <tr
            key={job.id}
            className="border-b border-hairline-soft transition-colors hover:bg-wash max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-1 max-md:py-3"
          >
            <td className="py-3 pr-4 max-md:col-span-2 max-md:py-0 max-md:pr-0">
              <Link
                href={`/recruiter/jobs/${job.id}/edit`}
                className="text-platinum underline-offset-4 hover:underline"
              >
                {job.title}
              </Link>
              {(job.department || job.location) && (
                <p className="mt-0.5 text-[13px]">
                  {[job.department, job.location].filter(Boolean).join(" · ")}
                </p>
              )}
            </td>
            <td className="py-3 pr-4 max-md:p-0">{typeLabel(job.employmentType)}</td>
            <td className="py-3 pr-4 max-md:p-0">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    job.status === "open" ? "bg-mist" : "shadow-[inset_0_0_0_1px_var(--color-silver-mist)]",
                  )}
                />
                {job.status === "open" ? "Open" : "Closed"}
              </span>
            </td>
            <td className="py-3 pr-4 text-right tabular-nums text-mist max-md:p-0 max-md:text-left">
              {job.applicantCount}
              <span className="md:hidden"> applicant{job.applicantCount === 1 ? "" : "s"}</span>
            </td>
            <td className="whitespace-nowrap py-3 pr-4 tabular-nums max-md:p-0">
              {postedDate(job.createdAt)}
            </td>
            <td className="whitespace-nowrap py-3 text-right max-md:col-span-2 max-md:mt-1.5 max-md:p-0 max-md:text-left">
              <Button asChild variant="ghost" size="sm" className="mr-2">
                <Link href={`/recruiter/jobs/${job.id}/applicants`}>Applicants</Link>
              </Button>
              <JobStatusButton jobId={job.id} status={job.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
