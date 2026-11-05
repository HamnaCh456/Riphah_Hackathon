import { Ring } from '@/components/ui/ring';

/**
 * Solid is the score. Pale is what the score could still reach if the missing evidence turns up.
 * Empty is lost for good, because it was confirmed missing or is only partly met.
 */
export function ScoreRing({ score, ceiling, size = 40, className }: {
  score: number;
  ceiling: number;
  size?: number;
  className?: string;
}) {
  return (
    <Ring
      size={size}
      stroke={size >= 64 ? 7 : 4}
      total={100}
      className={className}
      label={`Score ${score} out of 100, could reach ${ceiling}`}
      segments={[
        { value: score, color: 'var(--color-brand)' },
        { value: ceiling - score, color: 'var(--color-brand-pale)' },
      ]}
    >
      <span style={{ fontSize: Math.round(size * 0.34) }}>{score}</span>
    </Ring>
  );
}
