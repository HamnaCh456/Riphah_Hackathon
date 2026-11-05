import Link from "next/link";

import { cn } from "@/lib/utils";

const ICONS = {
  briefcase: "M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-11 0h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7zm0 5h16",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm-6 9c.3-3.7 2.8-6 6-6s5.7 2.3 6 6M16 4.3a3.5 3.5 0 0 1 0 6.4m2 3.8c1.8.8 3 2.7 3.2 5.5",
  review: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4-4",
  star: "m12 4 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z",
  calendar: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm-1 5h16M8 3.5V8m8-4.5V8",
} as const;

const TONES = {
  blue: "bg-tint text-brand",
  teal: "bg-teal-soft text-teal",
  gold: "bg-highlight text-[#8a6510]",
  navy: "bg-[#dfe6f1] text-navy",
} as const;

/** A number that opens the list behind it. */
export function StatCard({ label, value, href, icon, tone = "blue", testId }: {
  label: string;
  value: string | number;
  href: string;
  icon: keyof typeof ICONS;
  tone?: keyof typeof TONES;
  testId?: string;
}) {
  return (
    <Link href={href} className="card card-link flex h-full items-center gap-3 p-4">
      <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", TONES[tone])}>
        <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICONS[icon]} />
        </svg>
      </span>
      <span className="min-w-0">
        <span data-testid={testId} className="block text-[26px] font-semibold leading-none tracking-[-.02em] text-navy tabular-nums">
          {value}
        </span>
        <span className="mt-1 block text-[13px] leading-tight text-ink">{label}</span>
      </span>
    </Link>
  );
}
