import { AppShell } from "@/components/app-shell";
import { JobForm } from "@/components/jobs/job-form";
import { requireRecruiter } from "@/lib/auth/guards";

export const metadata = { title: "New job | Talent Intelligence" };

export default async function NewJobPage() {
  const profile = await requireRecruiter();

  return (
    <AppShell profile={profile}>
      <JobForm />
    </AppShell>
  );
}
