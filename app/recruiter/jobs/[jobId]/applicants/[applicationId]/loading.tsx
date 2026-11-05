import { CardsSkeleton, PageSkeleton, Skeleton, TitleSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <Skeleton className="h-3.5 w-40" />
      <TitleSkeleton className="mt-2" />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Skeleton className="h-44 w-full rounded-card" />
          <CardsSkeleton count={2} className="mt-3" />
        </div>
        <CardsSkeleton count={2} />
      </div>
    </PageSkeleton>
  );
}
