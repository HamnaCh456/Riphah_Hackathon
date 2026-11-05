// components/ui/select.tsx
"use client";

import * as RadixSelect from "@radix-ui/react-select";

export function ChevronDown({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={`${className} shrink-0 fill-none stroke-current`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <span className="mb-1 block font-arial text-sm">{label}</span>
      <RadixSelect.Root value={value} onValueChange={onChange}>
        <RadixSelect.Trigger aria-label={label}
          className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-small border bg-surface px-3 font-arial text-sm text-ink transition-colors hover:border-brand">
          <RadixSelect.Value placeholder="Choose" />
          <RadixSelect.Icon><ChevronDown /></RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content position="popper" sideOffset={4}
            className="z-50 max-h-64 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-small border bg-surface shadow-raised">
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item key={option.value} value={option.value}
                  className="cursor-pointer px-3 py-2 font-arial text-sm text-ink outline-none data-[highlighted]:bg-tint data-[highlighted]:text-navy">
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
