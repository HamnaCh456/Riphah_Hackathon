import { AppShell } from "@/components/app-shell";
import { requireRecruiter } from "@/lib/auth/guards";

// Pages still run their own check. A layout isn't re-run on every move between pages.
export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRecruiter();
  return <AppShell profile={profile}>{children}</AppShell>;
}
