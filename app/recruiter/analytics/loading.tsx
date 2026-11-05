import { PageSkeleton, Skeleton, StatCardsSkeleton, TitleSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="mb-4 flex items-center justify-between gap-4">
        <TitleSkeleton className="w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <StatCardsSkeleton />
      <Skeleton className="mt-4 h-36 w-full rounded-card" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-card" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    </PageSkeleton>
  );
}
