"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

const WAIT_AFTER_TYPING_MS = 700;

/**
 * Saves shortly after the last change, one save at a time, so an older save can't overwrite a
 * newer one. `save` returns false when it failed.
 */
export function useAutosave(save: () => Promise<boolean>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const latestSave = useRef(save);
  const hasChanges = useRef(false);
  const isRunning = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    latestSave.current = save;
  });

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!hasChanges.current || isRunning.current) return;

    isRunning.current = true;
    setStatus("saving");
    let ok = true;
    while (hasChanges.current && ok) {
      hasChanges.current = false;
      try {
        ok = await latestSave.current();
      } catch {
        ok = false;
      }
    }
    if (!ok) hasChanges.current = true;
    isRunning.current = false;
    setStatus(ok ? "saved" : "failed");
  }, []);

  const markChanged = useCallback(() => {
    hasChanges.current = true;
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, WAIT_AFTER_TYPING_MS);
  }, [flush]);

  // Closing the tab can cut off a save, so the browser asks first if one is still waiting.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasChanges.current || isRunning.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return { status, markChanged, flush };
}
