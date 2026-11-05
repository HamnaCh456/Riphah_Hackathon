import { AccountRows, AppShell } from "@/components/app-shell";
import { requireCandidate } from "@/lib/auth/guards";

export const metadata = { title: "Candidate dashboard | Talent Intelligence" };

export default async function CandidateHome() {
  const profile = await requireCandidate();

  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl">Candidate dashboard</h1>
      <AccountRows profile={profile} />
    </AppShell>
  );
}
