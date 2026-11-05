"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

function Arrow({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none",
        open && "rotate-180",
      )}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

/** Shown on a closed row so a claim needing a check is never hidden by the accordion. */
export function CheckFlag({ children }: { children: ReactNode }) {
  return <span className="shrink-0 font-arial text-xs text-danger">{children}</span>;
}

/** A top-level row: name, count and a one-line overview of what's inside. */
export function ResumeAccordion({
  title,
  count,
  summary,
  flagged = 0,
  children,
}: {
  title: string;
  count?: number;
  summary: string;
  flagged?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section aria-label={title}>
      <h2 className="text-base">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="flex min-h-14 w-full cursor-pointer flex-wrap rounded-small items-center gap-x-4 gap-y-0.5 px-4 py-3 text-left transition-colors hover:bg-wash sm:flex-nowrap"
        >
          <span className="w-32 shrink-0 text-navy">
            {title}
            {count !== undefined && (
              <span className="ml-2 font-arial text-sm tabular-nums text-muted">{count}</span>
            )}
          </span>
          {/* Takes its own line on a phone. Hidden when open, because the content says the same. */}
          {!open && (
            <span className="order-last min-w-0 basis-full truncate font-arial text-sm font-normal text-muted sm:order-none sm:flex-1 sm:basis-0">
              {summary}
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-3">
            {flagged > 0 && <CheckFlag>{flagged} to check</CheckFlag>}
            <Arrow open={open} />
          </span>
        </button>
      </h2>
      {open && (
        <div id={panelId} className="px-4 pb-4">
          {children}
        </div>
      )}
    </section>
  );
}

/** A row inside a section: one job, project, school or skill. */
export function ItemAccordion({
  open,
  onToggle,
  title,
  meta,
  flag,
  end,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  meta?: string;
  flag?: ReactNode;
  /** A control at the end of the row, outside the toggle. */
  end?: ReactNode;
  /** No children means there's nothing to open, so the row shows no arrow. */
  children?: ReactNode;
}) {
  const panelId = useId();
  const label = (
    <>
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="text-navy">{title}</span>
        {meta && <span className="font-arial text-muted"> · {meta}</span>}
      </span>
      {flag && <CheckFlag>{flag}</CheckFlag>}
    </>
  );

  return (
    <li className="border-t border-hairline-soft">
      <div className="flex items-center gap-1">
        {children ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
            className="-mx-1 flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-small px-1 py-1.5 text-left transition-colors hover:bg-wash"
          >
            {label}
            <Arrow open={open} />
          </button>
        ) : (
          <div className="flex min-h-10 min-w-0 flex-1 items-center gap-3 py-1.5">{label}</div>
        )}
        {end}
      </div>
      {open && children && (
        <div id={panelId} className="pb-3 pt-1">
          {children}
        </div>
      )}
    </li>
  );
}
