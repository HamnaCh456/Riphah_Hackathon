'use client';

import { Button } from '@/components/ui/button';

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-5 py-6 lg:pl-[280px] lg:pr-10">
      <p className="text-mist">This page could not load.</p>
      <Button variant="ghost" size="sm" className="mt-3" onClick={reset}>Try again</Button>
    </div>
  );
}
