import { notFound } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import { requireRecruiter } from "@/lib/auth/guards";
import { getOwnedJob } from "@/lib/jobs/queries";

export const metadata = { title: "Edit job" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const profile = await requireRecruiter();
  const { jobId } = await params;
  const job = await getOwnedJob(jobId, profile.id);
  if (!job) notFound();

  return (
    <>
      {/* The key resets the form when a save or status change brings new data. */}
      <JobForm key={`${job.id}-${job.status}`} job={job} />
    </>
  );
}
