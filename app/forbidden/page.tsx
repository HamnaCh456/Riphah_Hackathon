import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/guards";
import { roleHome } from "@/lib/auth/access";

export const metadata = { title: "No access" };

export default async function ForbiddenPage() {
  const profile = await getCurrentProfile();

  return (
    <main className="flex min-h-svh items-center justify-center p-5">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl">You don&apos;t have access to this page</h1>
        <p className="mt-3">
          {profile
            ? `This page isn't available to your ${profile.role} account.`
            : "We couldn't find a profile for this account."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {profile && (
            <Button asChild size="sm">
              <Link href={roleHome(profile.role)}>Go to my dashboard</Link>
            </Button>
          )}
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
