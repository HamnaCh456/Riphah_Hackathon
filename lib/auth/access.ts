export const ROLES = ["recruiter", "candidate"] as const;
export type Role = (typeof ROLES)[number];

export function roleHome(role: Role): string {
  return role === "recruiter" ? "/recruiter" : "/candidate";
}

/** Where someone lands after logging in. */
export function loginLanding(role: Role): string {
  return role === "recruiter" ? "/recruiter/jobs" : "/candidate/jobs";
}

/** Where someone lands after signing up: a new candidate needs a resume before they can apply. */
export function signUpLanding(role: Role): string {
  return role === "recruiter" ? "/recruiter/jobs" : "/candidate/resume";
}

/** The role a path belongs to, or null if any signed-in user may open it. */
export function requiredRole(pathname: string): Role | null {
  return (
    ROLES.find(
      (role) => pathname === `/${role}` || pathname.startsWith(`/${role}/`),
    ) ?? null
  );
}

/** Only same-site paths, so a crafted email link can't send people elsewhere. */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.includes("\\")) return "/";
  return next;
}
