"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const MAX_AGE_MS = 30_000;

/**
 * Tabs open at once from the browser's cache. So a recruiter still sees what candidates did in the
 * meantime, this reloads the data quietly when they arrive on a page, or come back to the browser
 * tab, and the last reload was over 30 seconds ago. The screen doesn't blank while it does this.
 */
export function KeepFresh() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const lastRefresh = useRef(0);

  useEffect(() => {
    const refreshIfOld = () => {
      if (Date.now() - lastRefresh.current < MAX_AGE_MS) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };

    // The first page of a visit has only just been loaded.
    if (lastRefresh.current === 0) lastRefresh.current = Date.now();
    else refreshIfOld();

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshIfOld();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router, pathname, search]);

  return null;
}
