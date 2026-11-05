import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-page text-ink",
  blue: "bg-tint text-brand-dark",
  teal: "bg-teal-soft text-[#0a5c5b]",
  gold: "bg-highlight text-[#6f520c]",
  danger: "bg-danger-soft text-danger",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "neutral", className, children }: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex w-fit items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}
