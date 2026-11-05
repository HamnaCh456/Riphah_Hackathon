"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Role } from "@/lib/auth/access";
import { cn } from "@/lib/utils";

const LINKS: Record<Role, { href: string; label: string }[]> = {
  recruiter: [
    { href: "/recruiter", label: "Dashboard" },
    { href: "/recruiter/jobs", label: "Jobs" },
    { href: "/recruiter/talent-search", label: "Talent search" },
    { href: "/recruiter/interviews", label: "Interviews" },
  ],
  candidate: [
    { href: "/candidate", label: "Dashboard" },
    { href: "/candidate/resume", label: "My resume" },
    { href: "/candidate/recommendations", label: "Jobs for you" },
  ],
};

export function ShellNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = LINKS[role];

  return (
    <nav
      aria-label="Main"
      className="order-last flex w-full gap-1 lg:order-none lg:mt-5 lg:flex-1 lg:flex-col"
    >
      {links.map((link) => {
        // The most specific matching link is the active one.
        const active =
          link.href ===
          links
            .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
            .sort((a, b) => b.href.length - a.href.length)[0]?.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-small px-2.5 py-2 font-arial text-sm transition-colors hover:bg-wash hover:text-platinum",
              active && "bg-kelp text-platinum",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
