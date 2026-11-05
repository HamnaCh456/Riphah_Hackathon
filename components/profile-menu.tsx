"use client";

import * as Popover from "@radix-ui/react-popover";

import { LogoutButton } from "@/components/logout-button";
import type { Profile } from "@/lib/auth/guards";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "?";

export function ProfileMenu({ profile }: { profile: Profile }) {
  const role = profile.role === "recruiter" ? "Recruiter" : "Candidate";
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Account menu for ${profile.fullName}`}
        className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 text-sm text-white transition-colors hover:bg-navy-raised focus-visible:outline-white"
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-semibold text-white"
        >
          {initials(profile.fullName)}
        </span>
        <span className="hidden max-w-40 truncate sm:block">{profile.fullName}</span>
        <svg aria-hidden="true" viewBox="0 0 10 6" className="h-1.5 w-2.5 shrink-0 fill-current">
          <path d="M0 0h10L5 6z" />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(18rem,calc(100vw-32px))] rounded-card border bg-surface p-4 shadow-raised animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <p className="break-words font-medium text-navy">{profile.fullName}</p>
          <p className="mt-0.5 break-words text-sm">{profile.email}</p>
          <p className="mt-2 w-fit rounded-full bg-tint px-2.5 py-0.5 text-xs font-medium text-ink">{role}</p>
          <div className="mt-3 border-t pt-3">
            <LogoutButton className="w-full" />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
