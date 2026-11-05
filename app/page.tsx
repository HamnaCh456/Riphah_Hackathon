import { redirect } from "next/navigation";

import { loginLanding } from "@/lib/auth/access";
import { getCurrentProfile } from "@/lib/auth/guards";

export default async function Home() {
  const profile = await getCurrentProfile();
  redirect(profile ? loginLanding(profile.role) : "/auth/login");
}
