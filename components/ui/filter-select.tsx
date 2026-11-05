// components/ui/filter-select.tsx
"use client";

import * as RadixSelect from "@radix-ui/react-select";

import { cn } from "@/lib/utils";

import { ChevronDown } from "./select";

/** The small rectangle used in filter rows. All filter controls share this look. */
export const filterControl =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-small border border-hairline-strong bg-surface px-3 font-arial text-sm font-medium text-ink transition-colors hover:border-brand hover:bg-wash hover:text-brand-dark";
export const filterControlActive = "border-brand bg-tint text-navy";

export function FilterSelect({ label, value, display, options, onChange, active, icon, className }: {
  label: string;
  value: string;
  /** What the closed control reads, such as "Stage" or "Stage: Interview". */
  display: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  active?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger aria-label={label} className={cn(filterControl, "min-w-0", active && filterControlActive, className)}>
        {icon}
        <span className="min-w-0 truncate"><RadixSelect.Value>{display}</RadixSelect.Value></span>
        <RadixSelect.Icon><ChevronDown /></RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content position="popper" align="end" sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] max-w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-card border bg-surface py-1 shadow-raised">
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item key={option.value} value={option.value}
                className="flex cursor-pointer items-center justify-between gap-4 px-3 py-2 font-arial text-sm text-ink outline-none data-[highlighted]:bg-tint data-[highlighted]:text-navy data-[state=checked]:font-medium data-[state=checked]:text-brand-dark">
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7" /></svg>
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
