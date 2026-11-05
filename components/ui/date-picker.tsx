// components/ui/date-picker.tsx
"use client";

import * as Popover from "@radix-ui/react-popover";
import { useId, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

const parse = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : undefined);
const pad = (n: number) => String(n).padStart(2, "0");
const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function DatePicker({ label, value, onChange, min }: {
  label: string; value: string; onChange: (value: string) => void; min?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const minDate = min ? parse(min) : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-arial text-sm">{label}</label>
      <div className="relative">
        <input id={id} value={value} placeholder="YYYY-MM-DD" onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full min-w-0 rounded-small border bg-surface pl-3 pr-10 font-arial text-sm text-ink transition-colors placeholder:text-muted/70 hover:border-brand focus:border-brand" />
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger aria-label="Open calendar"
            className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-small text-ink transition-colors hover:text-brand-dark">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm-1 5h16M8 3.5V8m8-4.5V8" />
            </svg>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content sideOffset={4} align="end" collisionPadding={16} className="z-50 rounded-card border bg-surface p-2 text-sm text-ink shadow-raised [--rdp-accent-background-color:var(--color-tint)] [--rdp-accent-color:var(--color-brand)]">
              <DayPicker mode="single" selected={parse(value)} defaultMonth={parse(value) ?? minDate}
                disabled={minDate ? { before: minDate } : undefined}
                onSelect={(day) => { if (day) { onChange(format(day)); setOpen(false); } }} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}
