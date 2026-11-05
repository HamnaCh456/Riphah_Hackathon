"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { Role } from "@/lib/auth/access";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  /** Other paths that belong to this tab. */
  also?: string[];
  /** Loading this page costs AI calls, so it waits until someone opens it. */
  noWarm?: boolean;
};

const LINKS: Record<Role, NavLink[]> = {
  recruiter: [
    { href: "/recruiter/analytics", label: "Dashboard" },
    { href: "/recruiter/jobs", label: "Jobs", also: ["/recruiter/applications"] },
    { href: "/recruiter/talent-search", label: "Talent search" },
    { href: "/recruiter/duplicates", label: "Duplicates" },
    { href: "/recruiter/interviews", label: "Interviews" },
  ],
  candidate: [
    { href: "/candidate", label: "Dashboard" },
    { href: "/candidate/jobs", label: "Open jobs" },
    { href: "/candidate/resume", label: "My resume" },
    { href: "/candidate/recommendations", label: "Jobs for you", noWarm: true },
    { href: "/candidate/applications", label: "My applications" },
  ],
};

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function ShellNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = LINKS[role];
  const activeRef = useRef<HTMLAnchorElement>(null);

  // The most specific matching link is the active one.
  const active = links
    .filter((l) => [l.href, ...(l.also ?? [])].some((base) => under(pathname, base)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // Applicant pages reload every few seconds while the AI works, and every reload would load all
  // the other tabs again too, so tabs only load ahead from the other pages.
  const warm = !pathname.includes("/applicants");

  // On a phone the row scrolls sideways, so keep the current tab in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  return (
    <nav
      aria-label="Main"
      className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto max-md:order-last max-md:w-full md:h-full md:flex-1 md:items-stretch"
    >
      {links.map((link) => {
        const current = link.href === active;
        return (
          <Link
            key={link.href}
            href={link.href}
            ref={current ? activeRef : undefined}
            prefetch={warm && !link.noWarm ? true : undefined}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm text-[#d5e2f3] transition-colors hover:border-[#6f93c4] hover:text-white focus-visible:outline-white md:py-0",
              current && "border-gold-bright font-medium text-white hover:border-gold-bright",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
