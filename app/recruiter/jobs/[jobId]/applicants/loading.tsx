import { PageSkeleton, Skeleton, TableSkeleton, TitleSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <Skeleton className="h-3.5 w-16" />
      <TitleSkeleton className="mt-2 w-72" />
      <Skeleton className="mt-4 h-20 w-full rounded-card" />
      <TableSkeleton className="mt-5" />
    </PageSkeleton>
  );
}
