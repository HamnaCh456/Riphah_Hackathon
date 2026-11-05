import Link from "next/link";

import { ApplyButton } from "@/components/pipeline/ApplyButton";
import { requireCandidate } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { Recommendations } from "@/lib/talent/recommend";
import { cachedRecommendations } from "@/lib/talent/recommend-cache";
import { plainSnippet } from "@/lib/talent/recommend-logic";

import { ChoicesDialog } from "./ChoicesDialog";

export const metadata = { title: "Jobs for you" };
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
    data = await cachedRecommendations(profile.id, interests);
  } catch (error) {
    console.error("Recommendations failed", error);
  }

  return (
    <>
      <div className="max-w-3xl">
        <h1 className="text-2xl">Jobs for you</h1>
        <p className="mt-2 text-sm">
          Based on the skills your resume supports, your projects and your
          interests. You decide what to apply for.
        </p>
        <ChoicesDialog
          interests={interests}
          consent={preferences?.talent_pool_consent ?? false}
        />

        {!data && (
          <p role="alert" className="mt-6 text-sm text-danger">
            Recommendations could not load. Reload to try again.
          </p>
        )}
        {data?.jobs.length === 0 && (
          <p className="card mt-5 p-5 text-sm">{EMPTY[data.status]}</p>
        )}
        {data && data.jobs.length > 0 && (
          <ul className="mt-5 space-y-3">
            {data.jobs.map((job) => (
              <li key={job.jobId} className="card p-5">
                <h2 className="text-base">{job.title}</h2>
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
      </div>
    </>
  );
}
