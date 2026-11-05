"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setJobStatus } from "@/app/recruiter/jobs/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { JobStatus } from "@/lib/jobs/queries";

export function JobStatusButton({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const closing = status === "open";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await setJobStatus(jobId, closing ? "closed" : "open");
          if (!result.ok) {
            toast(result.error ?? "Something went wrong.", { tone: "error" });
            return;
          }
          toast(closing ? "Job closed" : "Job reopened");
          router.refresh();
        })
      }
    >
      {closing ? "Close" : "Reopen"}
    </Button>
  );
}
