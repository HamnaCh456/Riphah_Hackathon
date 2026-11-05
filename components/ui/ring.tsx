import { cn } from "@/lib/utils";

export type RingSegment = { value: number; color: string };

/** A circular gauge. Segments run clockwise from the top, and whatever is left stays empty. */
export function Ring({ size = 40, stroke = 4, total, segments, label, className, children }: {
  size?: number;
  stroke?: number;
  total: number;
  segments: RingSegment[];
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(total, 1);
  let start = 0;

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
        {segments.filter((s) => s.value > 0).map((segment) => {
          const length = (Math.min(segment.value, safeTotal) / safeTotal) * circumference;
          const offset = -start;
          start += length;
          return (
            <circle
              key={segment.color}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={stroke}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      {children !== undefined && (
        <span className="relative font-semibold leading-none tabular-nums tracking-[-.02em] text-navy">{children}</span>
      )}
    </span>
  );
}
