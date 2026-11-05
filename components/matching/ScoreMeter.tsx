/**
 * Solid is the score. Hatched is what the score could still reach if the missing evidence turns up.
 * Empty is lost for good, because it was confirmed missing or is only partly met.
 */
export function ScoreMeter({ score, ceiling, className = '' }: {
  score: number;
  ceiling: number;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Score ${score} out of 100, could reach ${ceiling}`}
      className={`relative h-1.5 overflow-hidden rounded-full bg-hairline-soft ${className}`}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${ceiling}%`,
          backgroundImage:
            'repeating-linear-gradient(135deg, var(--hairline-strong) 0 2px, transparent 2px 4px)',
        }}
      />
      <div className="absolute inset-y-0 left-0 bg-lavender" style={{ width: `${score}%` }} />
    </div>
  );
}
