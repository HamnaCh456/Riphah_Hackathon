"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/** A row of radio buttons drawn as one control, so the arrow keys and screen readers work. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-small p-0.5 shadow-[inset_0_0_0_1px_var(--hairline)]",
        className,
      )}
    >
      {options.map((option) => (
        <label
          key={String(option.value)}
          className={cn(
            "flex min-w-7 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-[4px] px-2 py-1.5 text-center font-arial text-xs transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lavender",
            option.value === value
              ? "bg-kelp text-platinum shadow-[inset_0_0_0_1px_var(--hairline-strong)]"
              : "text-silver hover:bg-wash hover:text-platinum",
          )}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
