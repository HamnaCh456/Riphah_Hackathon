import { redirect } from "next/navigation";

import { roleHome } from "@/lib/auth/access";
import { getCurrentProfile } from "@/lib/auth/guards";

export default async function Home() {
  const profile = await getCurrentProfile();
  redirect(profile ? roleHome(profile.role) : "/auth/login");
}
