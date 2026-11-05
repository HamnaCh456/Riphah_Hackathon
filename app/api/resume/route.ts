import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/guards";
import { extractResumeText } from "@/lib/resume/extract-text";
import {
  checkResumeFile,
  RESUME_FAILURE_MESSAGES,
  type ResumeFailureCode,
} from "@/lib/resume/file-check";
import { storeAndParseResume } from "@/lib/resume/service";
import { recommendationsTagFor } from "@/lib/talent/recommend-cache";

// Gemini can take a while, and each try has its own timeout.
export const maxDuration = 60;

function failure(code: ResumeFailureCode, status: number) {
  return NextResponse.json(
    { ok: false, code, message: RESUME_FAILURE_MESSAGES[code] },
    { status },
  );
}

/** A route, not a server action: server actions cap request bodies at 1 MB by default. */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, message: "Sign in to upload a resume." }, { status: 401 });
  }
  if (profile.role !== "candidate") {
    return NextResponse.json({ ok: false, message: "Only candidates can upload a resume." }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return failure("missing_file", 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkResumeFile({ name: file.name, size: file.size, bytes });
  if (!check.ok) {
    return failure(check.code, check.code === "too_large" ? 413 : 415);
  }

  const text = await extractResumeText(bytes, check.fileType);
  if (!text.ok) return failure(text.code, 422);

  const outcome = await storeAndParseResume({
    candidateId: profile.id,
    fileName: file.name,
    fileType: check.fileType,
    rawText: text.text,
  });
  if (!outcome.ok) {
    return failure(outcome.code, outcome.code === "ai_failed" ? 502 : 422);
  }

  revalidateTag(recommendationsTagFor(profile.id), { expire: 0 });
  return NextResponse.json({ ok: true, resumeId: outcome.resumeId });
}
