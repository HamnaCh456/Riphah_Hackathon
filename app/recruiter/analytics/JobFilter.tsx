// app/recruiter/analytics/JobFilter.tsx
'use client';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/select';

const ALL = 'all';

export function JobFilter({ jobs, value }: { jobs: { id: string; title: string }[]; value?: string }) {
  const router = useRouter();
  return (
    <Select label="Job" value={value ?? ALL}
      options={[{ value: ALL, label: 'All jobs' }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]}
      onChange={(next) => router.push(next === ALL ? '/recruiter/analytics' : `/recruiter/analytics?job=${next}`)} />
  );
}
