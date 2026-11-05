// app/recruiter/analytics/RefreshOnShow.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// The browser may restore this page from memory on Back. Refreshing here keeps the
// numbers current after a recruiter shortlists someone and returns.
export function RefreshOnShow() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') router.refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);
  return null;
}
