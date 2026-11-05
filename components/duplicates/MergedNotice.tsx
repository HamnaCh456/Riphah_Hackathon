import Link from "next/link";

import { STATUS_LABELS } from "@/components/matching/labels";
import { db } from "@/lib/db";

/** Lists this person's other applications to this recruiter's jobs, across linked records. */
export async function MergedNotice({
  candidateId,
  applicationId,
  recruiterId,
}: {
  candidateId: string;
  applicationId: string;
  recruiterId: string;
}) {
  const admin = db();
  const { data: me } = await admin
    .from("profiles")
    .select("merged_into")
    .eq("id", candidateId)
    .maybeSingle();
  const root: string = me?.merged_into ?? candidateId;
  const { data: linked } = await admin
    .from("profiles")
    .select("id")
    .eq("merged_into", root);
  const ids = [root, ...(linked ?? []).map((p) => p.id as string)];
  if (ids.length < 2) return null;

  const { data: applications } = await admin
    .from("applications")
    .select("id, status, job:jobs!inner(id, title, recruiter_id)")
    .in("candidate_id", ids)
    .eq("job.recruiter_id", recruiterId)
    .neq("id", applicationId);

  return (
    <section aria-label="Linked records">
      <h2 className="text-platinum">Linked as the same person</h2>
      {applications?.length === 0 && (
        <p className="mt-1 text-sm">No other applications to your jobs.</p>
      )}
      <ul className="mt-1 text-sm">
        {applications?.map((application) => {
          const job = application.job as unknown as { id: string; title: string };
          return (
            <li key={application.id}>
              <Link
                href={`/recruiter/jobs/${job.id}/applicants/${application.id}`}
                className="textlink"
              >
                {job.title}
              </Link>
              : {STATUS_LABELS[application.status] ?? application.status}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
