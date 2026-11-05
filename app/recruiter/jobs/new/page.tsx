import { JobForm } from "@/components/jobs/job-form";
import { requireRecruiter } from "@/lib/auth/guards";

export const metadata = { title: "New job" };

export default async function NewJobPage() {
  await requireRecruiter();

  return (
    <>
      <JobForm />
    </>
  );
}
