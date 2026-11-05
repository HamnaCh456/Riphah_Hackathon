import { cn } from "@/lib/utils";

/** A person with a gold spark: talent, seen with AI. The same drawing as app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="#1b62c4" />
      <circle cx="14.5" cy="12" r="5" fill="#fff" />
      <path d="M5.5 26c.6-5.6 4.2-8.6 9-8.6s8.4 3 9 8.6z" fill="#fff" />
      <path d="M25 4l1.3 3.2L29.5 8.5l-3.2 1.3L25 13l-1.3-3.2-3.2-1.3 3.2-1.3z" fill="#e3b84a" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-[-.015em]", className)}>
      <LogoMark />
      Talent Intelligence
    </span>
  );
}
