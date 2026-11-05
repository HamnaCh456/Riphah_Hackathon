'use client';

import { Button } from '@/components/ui/button';

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="card mt-2 max-w-lg p-5">
      <h1 className="text-lg">This page could not load</h1>
      <p className="mt-1 text-sm">Check your connection, then try again.</p>
      <Button variant="ghost" size="sm" className="mt-3" onClick={reset}>Try again</Button>
    </div>
  );
}
