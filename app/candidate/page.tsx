import Link from "next/link";

import { StatCard } from "@/components/ui/stat-card";
import { requireCandidate } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getCandidateInterviews } from "@/lib/interviews/candidate-view";
import { getCurrentResume } from "@/lib/resume/service";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

const FINISHED = new Set(["selected", "not_selected"]);

// Reads only what a candidate may see: public job counts and their own simplified stages.
export default async function CandidateHome() {
  const profile = await requireCandidate();
  const supabase = await createClient();
  const [openJobs, mine, interviews, resume] = await Promise.all([
    db().from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.rpc("my_applications"),
    getCandidateInterviews(profile.id),
    getCurrentResume(profile.id),
  ]);
  const applications = (mine.data ?? []) as { public_status: string }[];
  const now = Date.now();

  return (
    <>
      <h1 className="text-2xl">Dashboard</h1>
      {!resume && (
        <p className="mt-2 text-sm text-ink">
          You need a resume to apply.{" "}
          <Link href="/candidate/resume" className="textlink">Upload your resume</Link>
        </p>
      )}
      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <li>
          <StatCard label="Open jobs" value={openJobs.count ?? 0} href="/candidate/jobs" icon="briefcase" tone="navy" />
        </li>
        <li>
          <StatCard label="My applications" value={applications.length} href="/candidate/applications" icon="people" />
        </li>
        <li>
          <StatCard
            label="In progress"
            value={applications.filter((a) => !FINISHED.has(a.public_status)).length}
            href="/candidate/applications"
            icon="review"
            tone="teal"
          />
        </li>
        <li>
          <StatCard
            label="Upcoming interviews"
            value={interviews.filter((i) => i.status === "scheduled" && Date.parse(i.ends_at) >= now).length}
            href="/candidate/applications"
            icon="calendar"
            tone="gold"
          />
        </li>
      </ul>
    </>
  );
}
