import { AppShell } from "@/components/app-shell";
import { requireCandidate } from "@/lib/auth/guards";

// Pages still run their own check. A layout isn't re-run on every move between pages.
export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireCandidate();
  return <AppShell profile={profile}>{children}</AppShell>;
}
