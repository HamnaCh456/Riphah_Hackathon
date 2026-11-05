import Link from "next/link";

import { AccountRows, AppShell } from "@/components/app-shell";
import { requireCandidate } from "@/lib/auth/guards";

export const metadata = { title: "Candidate dashboard | Talent Intelligence" };

export default async function CandidateHome() {
  const profile = await requireCandidate();

  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl">Candidate dashboard</h1>
      <nav aria-label="Go to" className="mt-3 flex flex-wrap gap-4 font-arial text-sm">
        <Link href="/candidate/jobs" className="textlink">Jobs</Link>
        <Link href="/candidate/resume" className="textlink">Resume</Link>
        <Link href="/candidate/applications" className="textlink">Applications</Link>
      </nav>
      <AccountRows profile={profile} />
    </AppShell>
  );
}
