import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { roleHome } from "@/lib/auth/access";
import type { Profile } from "@/lib/auth/guards";

/** Left rail plus content area, shared by recruiter and candidate screens. */
export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="flex items-center justify-between gap-4 border-b bg-deep px-5 py-3 lg:sticky lg:top-0 lg:h-svh lg:w-60 lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r lg:p-5">
        <Link
          href={roleHome(profile.role)}
          className="text-[17px] font-medium tracking-[-.02em] text-platinum transition-colors hover:text-silver"
        >
          Talent Intelligence
        </Link>
        <div className="flex min-w-0 items-center gap-3 lg:flex-col lg:items-stretch">
          <p className="hidden min-w-0 truncate font-arial text-sm sm:block">
            {profile.fullName}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-10">{children}</main>
    </div>
  );
}

/** Ruled rows of account details: a hairline per row, no boxes. */
export function AccountRows({ profile }: { profile: Profile }) {
  const rows = [
    ["Name", profile.fullName],
    ["Email", profile.email],
    ["Role", profile.role === "recruiter" ? "Recruiter" : "Candidate"],
  ];
  return (
    <dl className="mt-6 max-w-2xl border-b text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-t py-3"
        >
          <dt>{label}</dt>
          <dd className="break-words text-mist">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
