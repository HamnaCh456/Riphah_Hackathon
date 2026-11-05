"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { MAX_RESUME_BYTES, RESUME_FAILURE_MESSAGES } from "@/lib/resume/file-check";
import { cn } from "@/lib/utils";

/** The whole box is the control: click, drag and drop, or Enter/Space. */
export function ResumeUpload({ compact }: { compact: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file || uploading) return;
    setError(null);

    // Stop here to avoid sending a file the server can't accept.
    if (file.size > MAX_RESUME_BYTES) {
      setError(RESUME_FAILURE_MESSAGES.too_large);
      return;
    }

    setUploading(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/resume", { method: "POST", body: form });
      const result = await response.json().catch(() => null);

      if (result?.ok) {
        toast("Resume read. Check the details below.");
        router.refresh();
      } else if (result?.code === "ai_failed") {
        // The page shows a retry for this one, from the stored text.
        router.refresh();
      } else {
        setError(result?.message ?? RESUME_FAILURE_MESSAGES.ai_failed);
      }
    } catch {
      setError("The upload didn't finish. Check your connection and try again.");
    } finally {
      setUploading(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-busy={Boolean(uploading)}
        aria-label={compact ? "Replace resume file" : "Upload resume"}
        onClick={() => input.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void upload(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer rounded-small border border-dashed border-hairline-strong font-arial text-sm transition-colors hover:border-silver hover:bg-wash",
          compact
            ? "items-center justify-center px-4 py-2.5 text-mist"
            : "min-h-56 flex-col items-center justify-center gap-1.5 p-6 text-center",
          isDragging && "border-silver bg-wash",
          uploading && "pointer-events-none",
        )}
      >
        {uploading ? (
          <span role="status" className="text-mist">
            Reading {uploading}...
          </span>
        ) : compact ? (
          "Replace file"
        ) : (
          <>
            <span className="text-base text-platinum">Drop your resume here, or click to choose</span>
            <span>PDF or DOCX, up to 4 MB</span>
          </>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="mt-2 font-arial text-sm text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
