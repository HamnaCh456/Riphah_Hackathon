"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Pages already in the cache open faster than this, so they never flash the bar.
const SHOW_AFTER_MS = 120;
const GIVE_UP_MS = 15_000;

/** A thin bar under the navbar from the click on a link until the new page arrives. */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(false);
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.("a");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      stop();
      timers.current = [
        window.setTimeout(() => setVisible(true), SHOW_AFTER_MS),
        window.setTimeout(stop, GIVE_UP_MS),
      ];
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // A new address means the page has arrived.
  useEffect(stop, [pathname, search]);

  if (!visible) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-[var(--nav-height)] z-40 h-0.5 overflow-hidden"
    >
      <div className="progress-bar !bg-gold-bright" />
    </div>
  );
}
