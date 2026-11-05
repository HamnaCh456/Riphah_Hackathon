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
      <div className="flex gap-2">
        <input id={id} value={value} placeholder="YYYY-MM-DD" onChange={(e) => onChange(e.target.value)}
          className="h-12 min-w-0 flex-1 rounded-small border bg-surface px-3 font-arial text-sm text-ink" />
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger aria-label="Open calendar"
            className="h-12 cursor-pointer rounded-small border px-3 font-arial text-sm text-ink hover:border-hairline-strong">
            Calendar
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content sideOffset={4} className="z-50 rounded-small border bg-surface p-2 text-sm text-ink">
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
