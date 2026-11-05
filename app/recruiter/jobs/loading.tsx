import { PageSkeleton, TableSkeleton, TitleSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <TitleSkeleton className="w-40" />
      <TableSkeleton className="mt-5" />
    </PageSkeleton>
  );
}
