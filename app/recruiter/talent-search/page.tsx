import { AppShell } from "@/components/app-shell";
import { TalentSearchForm } from "@/components/talent/TalentSearchForm";
import { requireRecruiter } from "@/lib/auth/guards";

export const metadata = { title: "Talent search | Talent Intelligence" };
export const maxDuration = 60;

export default async function TalentSearchPage() {
  const profile = await requireRecruiter();
  return (
    <AppShell profile={profile}>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-medium text-platinum">Talent search</h1>
        <p className="mt-2 text-sm">
          Describe who you need in plain language. This searches applicants to
          your jobs from the last 180 days.
        </p>
        <TalentSearchForm />
      </div>
    </AppShell>
  );
}
