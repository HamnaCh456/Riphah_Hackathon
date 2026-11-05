import Link from "next/link";

import { DrillLink, type DrillTarget } from "@/app/recruiter/analytics/DrillDialog";
import { cn } from "@/lib/utils";

const ICONS = {
  briefcase: "M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-11 0h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7zm0 5h16",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm-6 9c.3-3.7 2.8-6 6-6s5.7 2.3 6 6M16 4.3a3.5 3.5 0 0 1 0 6.4m2 3.8c1.8.8 3 2.7 3.2 5.5",
  review: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4-4",
  star: "m12 4 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z",
  calendar: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm-1 5h16M8 3.5V8m8-4.5V8",
} as const;

const TONES = {
  blue: "text-brand",
  teal: "text-teal",
  gold: "text-gold",
  navy: "text-navy",
} as const;

/** A number that opens the list behind it, in a pop-up when it has a drill target. */
export function StatCard({ label, value, href, icon, tone = "blue", testId, drill }: {
  label: string;
  value: string | number;
  href: string;
  icon: keyof typeof ICONS;
  tone?: keyof typeof TONES;
  testId?: string;
  drill?: DrillTarget;
}) {
  const className = "card card-link flex h-full items-start justify-between gap-3 px-4 py-3.5";
  const body = (
    <>
      <span className="min-w-0">
        <span data-testid={testId} className="block text-[26px] font-semibold leading-none tracking-[-.02em] text-navy tabular-nums">
          {value}
        </span>
        <span className="mt-1.5 block text-[13px] leading-tight text-ink">{label}</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-[18px] shrink-0 fill-none stroke-current", TONES[tone])} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[icon]} />
      </svg>
    </>
  );
  return drill
    ? <DrillLink href={href} target={drill} className={className}>{body}</DrillLink>
    : <Link href={href} className={className}>{body}</Link>;
}
