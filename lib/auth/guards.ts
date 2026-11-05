import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "./access";

export type Profile = {
  id: string;
  role: Role;
  fullName: string;
  email: string;
};

/** The signed-in user's profile, or null. Cached for one request. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    role: data.role,
    fullName: data.full_name,
    email: data.email,
  };
});

async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");
  if (profile.role !== role) redirect("/forbidden");
  return profile;
}

/** Call at the top of every recruiter page and server action. */
export const requireRecruiter = () => requireRole("recruiter");

/** Call at the top of every candidate page and server action. */
export const requireCandidate = () => requireRole("candidate");
