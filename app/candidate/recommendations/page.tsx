import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ActionForm } from "@/components/matching/ActionForm";
import { ApplyButton } from "@/components/pipeline/ApplyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireCandidate } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { recommendJobs, type Recommendations } from "@/lib/talent/recommend";
import { plainSnippet } from "@/lib/talent/recommend-logic";

import { savePreferencesAction } from "./actions";

export const metadata = { title: "Jobs for you | Talent Intelligence" };
export const maxDuration = 60; // Applying runs the assessment after the response.

const EMPTY: Record<Recommendations["status"], React.ReactNode> = {
  needs_resume: (
    <>
      Upload your resume to see jobs that suit you.{" "}
      <Link href="/candidate/resume" className="textlink">
        Upload resume
      </Link>
    </>
  ),
  needs_verified_skills: (
    <>
      We recommend jobs from skills your resume supports, and we haven&apos;t found
      any yet.{" "}
      <Link href="/candidate/resume" className="textlink">
        Review your resume
      </Link>
    </>
  ),
  ok: "No open jobs closely suit your skills right now. Check back later.",
};

export default async function RecommendationsPage() {
  const profile = await requireCandidate();
  const admin = db();
  const { data: preferences } = await admin
    .from("candidate_preferences")
    .select("interests, talent_pool_consent")
    .eq("candidate_id", profile.id)
    .maybeSingle();
  const interests: string[] = preferences?.interests ?? [];

  let data: Recommendations | null = null;
  try {
    data = await recommendJobs(admin, profile.id, interests);
  } catch (error) {
    console.error("Recommendations failed", error);
  }

  return (
    <AppShell profile={profile}>
      <div className="max-w-3xl">
        <h1 className="text-2xl">Jobs for you</h1>
        <p className="mt-2 text-sm">
          Based on the skills your resume supports, your projects and your
          interests. You decide what to apply for.
        </p>

        {!data && (
          <p role="alert" className="mt-6 text-sm text-coral">
            Recommendations could not load. Reload to try again.
          </p>
        )}
        {data?.jobs.length === 0 && (
          <p className="mt-6 border-t pt-4 text-sm">{EMPTY[data.status]}</p>
        )}
        {data && data.jobs.length > 0 && (
          <ul className="mt-6 border-b">
            {data.jobs.map((job) => (
              <li key={job.jobId} className="border-t py-4">
                <p className="text-platinum">{job.title}</p>
                <p className="mt-1 text-sm">{plainSnippet(job.description)}</p>
                {job.matchedSkills.length > 0 && (
                  <p className="mt-2 text-sm">
                    Your skills that fit: {job.matchedSkills.join(", ")}
                  </p>
                )}
                {job.otherRequirements.length > 0 && (
                  <p className="mt-1 text-sm">
                    This job also asks for: {job.otherRequirements.join(", ")}
                  </p>
                )}
                <div className="mt-3">
                  <ApplyButton jobId={job.jobId} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <section aria-label="Your choices" className="mt-8">
          <h2 className="text-platinum">Your choices</h2>
          <ActionForm action={savePreferencesAction} className="mt-3 space-y-3">
            <div>
              <label htmlFor="interests" className="mb-1 block font-arial text-sm">
                What kind of work interests you? Separate items with commas.
              </label>
              <Input
                id="interests"
                name="interests"
                maxLength={300}
                defaultValue={interests.join(", ")}
                placeholder="fintech, backend services"
              />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="consent"
                defaultChecked={preferences?.talent_pool_consent ?? false}
              />
              Let recruiters I applied to consider my resume for their other jobs
            </label>
            <p className="text-sm">
              If you agree, a recruiter can find your resume for 180 days after you
              apply. You can change this at any time.
            </p>
            <Button variant="ghost" size="sm">
              Save choices
            </Button>
          </ActionForm>
        </section>
      </div>
    </AppShell>
  );
}
