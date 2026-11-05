import { TalentSearchForm } from "@/components/talent/TalentSearchForm";
import { requireRecruiter } from "@/lib/auth/guards";

export const metadata = { title: "Talent search" };
export const maxDuration = 60;

export default async function TalentSearchPage() {
  await requireRecruiter();
  return (
    <>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-medium text-navy">Talent search</h1>
        <p className="mt-2 text-sm">
          Describe who you need in plain language. This searches applicants to
          your jobs from the last 180 days.
        </p>
        <TalentSearchForm />
      </div>
    </>
  );
}
