import { AccountRows, AppShell } from "@/components/app-shell";
import { requireRecruiter } from "@/lib/auth/guards";

export const metadata = { title: "Recruiter dashboard | Talent Intelligence" };

export default async function RecruiterHome() {
  const profile = await requireRecruiter();

  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl">Recruiter dashboard</h1>
      <AccountRows profile={profile} />
    </AppShell>
  );
}
