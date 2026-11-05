import { PageSkeleton, Skeleton, TableSkeleton, TitleSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <TitleSkeleton className="w-44" />
      <Skeleton className="mt-6 h-3.5 w-32" />
      <TableSkeleton rows={4} className="mt-3" />
    </PageSkeleton>
  );
}
