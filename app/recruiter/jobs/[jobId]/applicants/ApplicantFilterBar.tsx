'use client';

import * as Popover from '@radix-ui/react-popover';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { STATUS_LABELS } from '@/components/matching/labels';
import { Button } from '@/components/ui/button';
import { FilterSelect, filterControl, filterControlActive } from '@/components/ui/filter-select';
import { ChevronDown } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ANY = 'any';

export type FilterValues = {
  q: string; skill: string; status: string; minScore: string; needsReview: boolean; noRequiredGaps: boolean;
};

const EMPTY: FilterValues = { q: '', skill: '', status: '', minScore: '', needsReview: false, noRequiredGaps: false };

export function ApplicantFilterBar({ values, skills }: { values: FilterValues; skills: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState(values.q);
  const [open, setOpen] = useState(false);
  const [minScore, setMinScore] = useState(values.minScore);
  const [needsReview, setNeedsReview] = useState(values.needsReview);
  const [noRequiredGaps, setNoRequiredGaps] = useState(values.noRequiredGaps);
  // What was last asked for. The page can lag behind it, so quick changes build on this, not the props.
  const intended = useRef(values);
  const lastProps = useRef(values);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The address changed from outside this bar, such as the browser's back button.
  useEffect(() => {
    if (JSON.stringify(lastProps.current) === JSON.stringify(values)) return;
    lastProps.current = values;
    if (JSON.stringify(intended.current) === JSON.stringify(values)) return;
    intended.current = values;
    setSearch(values.q);
  }, [values]);

  const apply = (patch: Partial<FilterValues>) => {
    clearTimeout(searchTimer.current);
    const next = { ...intended.current, ...patch };
    intended.current = next;
    const query = new URLSearchParams();
    if (next.q.trim()) query.set('q', next.q.trim());
    if (next.skill) query.set('skill', next.skill);
    if (next.status) query.set('status', next.status);
    if (next.minScore) query.set('minScore', next.minScore);
    if (next.needsReview) query.set('needsReview', 'on');
    if (next.noRequiredGaps) query.set('noRequiredGaps', 'on');
    const text = query.toString();
    start(() => router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false }));
  };

  // Search as the person types, once they pause.
  const onSearch = (text: string) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => apply({ q: text.trim() }), 300);
  };

  const extraCount = Number(Boolean(values.minScore)) + Number(values.needsReview) + Number(values.noRequiredGaps);
  const anyActive = extraCount > 0 || Boolean(values.q || values.skill || values.status);

  const clearAll = () => {
    setSearch(''); setMinScore(''); setNeedsReview(false); setNoRequiredGaps(false); setOpen(false);
    apply(EMPTY);
  };

  const applyPanel = () => {
    setOpen(false);
    apply({ minScore: minScore.trim(), needsReview, noRequiredGaps });
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-busy={pending}>
      <label className="relative min-w-0 flex-[1_1_220px] sm:max-w-xs">
        <span className="sr-only">Search applicants by name</span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
          {pending ? <span className="spinner" /> : (
            <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4-4" /></svg>
          )}
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search"
          className="h-9 w-full rounded-small border border-hairline-strong bg-surface pl-9 pr-3 font-arial text-sm text-ink transition-colors placeholder:text-muted hover:border-brand focus:border-brand"
        />
      </label>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto">
        {anyActive && (
          <button type="button" onClick={clearAll} className="cursor-pointer px-1 font-arial text-sm transition-colors hover:text-brand-dark">
            Clear all
          </button>
        )}
        <FilterSelect
          label="Stage"
          value={values.status || ANY}
          display={values.status ? `Stage: ${STATUS_LABELS[values.status] ?? values.status}` : 'Stage'}
          active={Boolean(values.status)}
          options={[{ value: ANY, label: 'Any stage' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
          onChange={(next) => apply({ status: next === ANY ? '' : next })}
        />
        <FilterSelect
          label="Backed skill"
          value={values.skill || ANY}
          display={values.skill ? `Skill: ${values.skill}` : 'Backed skill'}
          active={Boolean(values.skill)}
          className="max-w-[200px]"
          options={[{ value: ANY, label: 'Any skill' }, ...skills.map((s) => ({ value: s, label: s }))]}
          onChange={(next) => apply({ skill: next === ANY ? '' : next })}
        />
        <Popover.Root
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) { setMinScore(values.minScore); setNeedsReview(values.needsReview); setNoRequiredGaps(values.noRequiredGaps); }
          }}
        >
          <Popover.Trigger className={cn(filterControl, extraCount > 0 && filterControlActive)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M7 12h10M10 17h4" /></svg>
            Filters
            {extraCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-brand text-xs text-white">{extraCount}</span>}
            <ChevronDown />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={6} collisionPadding={16}
              className="z-50 w-[min(340px,calc(100vw-32px))] rounded-card border bg-surface font-arial text-sm text-ink shadow-raised">
              <form onSubmit={(event) => { event.preventDefault(); applyPanel(); }}>
                <div className="space-y-3 p-3">
                  <label className="flex items-center justify-between gap-3">
                    Minimum score
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      value={minScore}
                      onChange={(event) => setMinScore(event.target.value)}
                      placeholder="0 to 100"
                      className="h-9 w-24 rounded-small border border-hairline-strong bg-surface px-3 transition-colors placeholder:text-muted hover:border-brand focus:border-brand"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 transition-colors hover:text-brand-dark">
                    <input type="checkbox" className="size-4" checked={needsReview} onChange={(event) => setNeedsReview(event.target.checked)} />
                    Needs manual check
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 transition-colors hover:text-brand-dark">
                    <input type="checkbox" className="size-4" checked={noRequiredGaps} onChange={(event) => setNoRequiredGaps(event.target.checked)} />
                    All required skills backed
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t p-3">
                  <Button type="button" variant="ghost" size="sm" onClick={clearAll}>Clear all</Button>
                  <Button type="submit" size="sm">Apply filter</Button>
                </div>
              </form>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}
