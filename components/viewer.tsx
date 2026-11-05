"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const PREFIX = "ti:";
const ViewerContext = createContext("anonymous");

export function ViewerProvider({ userId, children }: { userId: string; children: ReactNode }) {
  return <ViewerContext.Provider value={userId}>{children}</ViewerContext.Provider>;
}

/**
 * State that survives leaving a tab and reloading, for results that are slow to produce (AI search,
 * fairness check). Kept per signed-in user, for this browser tab only, and cleared at log out.
 */
export function useSessionState<T>(key: string, initial: T): [T, (value: T) => void] {
  const storageKey = `${PREFIX}${useContext(ViewerContext)}:${key}`;
  const [value, setValue] = useState(initial);

  // Read after mount, because the server can't see this tab's storage.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved !== null) setValue(JSON.parse(saved) as T);
    } catch {
      // Blocked or full storage only costs the convenience.
    }
  }, [storageKey]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // As above.
      }
    },
    [storageKey],
  );

  return [value, update];
}

export function clearSessionState() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
