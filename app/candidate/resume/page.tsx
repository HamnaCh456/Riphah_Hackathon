import { AppShell } from "@/components/app-shell";
import { ResumeWorkspace } from "@/components/resume/resume-workspace";
import { requireCandidate } from "@/lib/auth/guards";
import { getCurrentResume, getRetryableResume } from "@/lib/resume/service";

export const metadata = { title: "My resume | Talent Intelligence" };

export default async function ResumePage() {
  const profile = await requireCandidate();
  const [resume, retryable] = await Promise.all([
    getCurrentResume(profile.id),
    getRetryableResume(profile.id),
  ]);

  return (
    <AppShell profile={profile}>
      {/* The key resets unsaved edits when a different or newly saved resume loads. */}
      <ResumeWorkspace
        key={`${resume?.id}-${resume?.correctedAt}`}
        resume={resume}
        retryable={retryable}
      />
    </AppShell>
  );
}
