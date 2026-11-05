import { CardsSkeleton, PageSkeleton, TitleSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <TitleSkeleton />
      <CardsSkeleton className="mt-5" />
    </PageSkeleton>
  );
}
