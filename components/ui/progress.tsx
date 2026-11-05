import { cn } from "@/lib/utils";

/** For work with no known length, like an AI call. The label says what is happening. */
export function ProgressNote({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" className={cn("max-w-md text-sm text-ink", className)}>
      <p>{label}</p>
      <div className="progress-track mt-1.5" aria-hidden="true">
        <div className="progress-bar" />
      </div>
    </div>
  );
}
