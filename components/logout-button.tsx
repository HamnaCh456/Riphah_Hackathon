"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { clearSessionState } from "@/components/viewer";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    clearSessionState();
    // A full page load empties the page cache, so the next person on this browser can't see it.
    window.location.assign("/auth/login");
  };

  return (
    <Button variant="ghost" size="sm" onClick={logout} loading={busy} className={className}>
      Log out
    </Button>
  );
}
