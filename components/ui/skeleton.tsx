import { cn } from "@/lib/utils";

/** Shapes that hold a page's layout while its data loads, so nothing jumps when it arrives. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton h-4", className)} />;
}

export function PageSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

export function TitleSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-8 w-56", className)} />;
}

export function StatCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card px-4 py-3.5">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="mt-1.5 h-3.5 w-full max-w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="bg-page px-4 py-3">
        <Skeleton className="h-3.5 w-1/3" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-hairline-soft px-4 py-3.5">
          <Skeleton className="w-2/5" />
          <Skeleton className="w-1/5" />
          <Skeleton className="w-1/6 max-md:hidden" />
          <Skeleton className="ml-auto h-8 w-20 max-sm:hidden" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="w-2/5" />
          <Skeleton className="mt-3 h-3.5 w-4/5" />
          <Skeleton className="mt-2 h-3.5 w-3/5" />
        </div>
      ))}
    </div>
  );
}
