// components/ui/select.tsx
"use client";

import * as RadixSelect from "@radix-ui/react-select";

export function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <span className="mb-1 block font-arial text-sm">{label}</span>
      <RadixSelect.Root value={value} onValueChange={onChange}>
        <RadixSelect.Trigger aria-label={label}
          className="flex h-12 w-full cursor-pointer items-center justify-between rounded-small border bg-surface px-3 font-arial text-sm text-ink transition-colors hover:border-brand">
          <RadixSelect.Value placeholder="Choose" />
          <RadixSelect.Icon aria-hidden="true">▾</RadixSelect.Icon>
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
