import { ResumeWorkspace } from "@/components/resume/resume-workspace";
import { requireCandidate } from "@/lib/auth/guards";
import { getCurrentResume, getRetryableResume } from "@/lib/resume/service";

export const metadata = { title: "My resume" };

export default async function ResumePage() {
  const profile = await requireCandidate();
  const [resume, retryable] = await Promise.all([
    getCurrentResume(profile.id),
    getRetryableResume(profile.id),
  ]);

  return (
    <>
      {/* The key resets the editor for a different resume. It must not change on a save,
          because auto-save would then reload the editor while the candidate is typing. */}
      <ResumeWorkspace
        key={resume?.id}
        resume={resume}
        retryable={retryable}
      />
    </>
  );
}
