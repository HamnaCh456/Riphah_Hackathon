// e2e/global-teardown.ts
// Tests share the live database, so their jobs would otherwise stay open and show up for real
// candidates. Nothing is deleted, because application history is append-only.
import { createClient } from "@supabase/supabase-js";

export default async function globalTeardown(): Promise<void> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY ?? process.env.ANON_API_KEY!,
    { auth: { persistSession: false } },
  );

  const recruiters = await admin.from("profiles").select("id").like("email", "e2e+recruiter-%@example.invalid");
  if (recruiters.error) throw recruiters.error;
  if (recruiters.data.length === 0) return;

  const closed = await admin
    .from("jobs")
    .update({ status: "closed" })
    .eq("status", "open")
    .in("recruiter_id", recruiters.data.map((row) => row.id));
  if (closed.error) throw closed.error;
}
