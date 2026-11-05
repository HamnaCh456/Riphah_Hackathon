import { cn } from "@/lib/utils";

/** For work with no known length, like an AI call. The label says what is happening. */
export function ProgressNote({ label, className }: { label: string; className?: string }) {
  return (
    <p role="status" className={cn("flex max-w-md items-center gap-2 text-sm text-ink", className)}>
      <span aria-hidden="true" className="spinner text-brand" />
      {label}
    </p>
  );
}
