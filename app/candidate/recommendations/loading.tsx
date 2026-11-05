import { CardsSkeleton, PageSkeleton, TitleSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="max-w-3xl">
        <TitleSkeleton />
        <CardsSkeleton count={3} className="mt-5" />
      </div>
    </PageSkeleton>
  );
}
