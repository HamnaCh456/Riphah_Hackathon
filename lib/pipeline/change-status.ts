import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "./statuses";

/**
 * The only way a recruiter's action changes a status. It runs as the signed-in recruiter, and the
 * database function checks ownership and the transition, then writes the audit row.
 */
export async function changeApplicationStatus(args: {
  applicationId: string;
  to: ApplicationStatus;
  reason?: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_application_status", {
    p_application_id: args.applicationId,
    p_to: args.to,
    p_reason: args.reason ?? null,
  });
  if (error) throw new Error(error.message);
}
