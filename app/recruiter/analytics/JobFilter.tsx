// app/recruiter/analytics/JobFilter.tsx
'use client';
import { useRouter } from 'next/navigation';
import { FilterSelect } from '@/components/ui/filter-select';

const ALL = 'all';

export function JobFilter({ jobs, value }: { jobs: { id: string; title: string }[]; value?: string }) {
  const router = useRouter();
  const chosen = jobs.find((j) => j.id === value);
  return (
    <FilterSelect
      label="Job"
      value={value ?? ALL}
      display={chosen?.title ?? 'All jobs'}
      active={Boolean(chosen)}
      className="max-w-[260px]"
      icon={
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-11 0h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7zm0 5h16" />
        </svg>
      }
      options={[{ value: ALL, label: 'All jobs' }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]}
      onChange={(next) => router.push(next === ALL ? '/recruiter/analytics' : `/recruiter/analytics?job=${next}`)}
    />
  );
}
