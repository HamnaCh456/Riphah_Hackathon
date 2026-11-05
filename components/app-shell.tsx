import Link from "next/link";
import { Suspense } from "react";

import { KeepFresh } from "@/components/keep-fresh";
import { Logo } from "@/components/logo";
import { NavProgress } from "@/components/nav-progress";
import { ProfileMenu } from "@/components/profile-menu";
import { ShellNav } from "@/components/shell-nav";
import { ViewerProvider } from "@/components/viewer";
import type { Profile } from "@/lib/auth/guards";

const DASHBOARD = { recruiter: "/recruiter/analytics", candidate: "/candidate" } as const;

/** The top navbar and content area. It lives in the role layouts, so it stays put between pages. */
export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <ViewerProvider userId={profile.id}>
      <header className="sticky top-0 z-30 bg-navy shadow-card">
        <div className="mx-auto flex min-h-[var(--nav-height)] max-w-[1440px] flex-wrap items-center justify-between gap-x-6 px-5 md:h-[var(--nav-height)] md:flex-nowrap lg:px-10">
          <Link
            href={DASHBOARD[profile.role]}
            aria-label="Talent Intelligence dashboard"
            className="flex h-[56px] shrink-0 items-center rounded-small text-white focus-visible:outline-white md:h-auto"
          >
            <Logo />
          </Link>
          <ShellNav role={profile.role} />
          <ProfileMenu profile={profile} />
        </div>
      </header>
      <Suspense>
        <NavProgress />
        <KeepFresh />
      </Suspense>
      <main className="mx-auto min-h-[calc(100svh-var(--nav-height))] w-full max-w-[1440px] px-5 py-6 lg:px-10">
        {children}
      </main>
    </ViewerProvider>
  );
}
