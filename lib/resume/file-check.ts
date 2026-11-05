export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // Vercel rejects request bodies above 4.5 MB.

export type ResumeFailureCode =
  | "missing_file"
  | "too_large"
  | "empty_file"
  | "unsupported_type"
  | "no_text"
  | "unreadable"
  | "password_protected"
  | "not_a_resume"
  | "ai_failed";

export const RESUME_FAILURE_MESSAGES: Record<ResumeFailureCode, string> = {
  missing_file: "Choose a PDF or DOCX file to upload.",
  too_large: "This file is over 4 MB. Upload a smaller PDF or DOCX.",
  empty_file: "This file is empty. Upload a PDF or DOCX that contains your resume.",
  unsupported_type: "This file type isn't supported. Upload a PDF or DOCX.",
  no_text:
    "We found no text in this file. It may be blank or a scanned image. Upload a PDF or DOCX with selectable text.",
  unreadable: "This file is damaged and can't be opened. Export it again and upload the new copy.",
  password_protected: "This file is password protected. Remove the password and upload it again.",
  not_a_resume: "This doesn't look like a resume. Check that you chose the right file.",
  ai_failed: "Your file was received, but it couldn't be read right now. Try again.",
};

export type ResumeFileType = "pdf" | "docx";

export type FileCheck =
  | { ok: true; fileType: ResumeFileType }
  | { ok: false; code: ResumeFailureCode };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // A DOCX is a zip file.

/** Trusts the file's bytes, because a name or browser-supplied type can say anything. */
export function checkResumeFile(file: {
  name: string;
  size: number;
  bytes: Uint8Array;
}): FileCheck {
  if (file.size === 0) return { ok: false, code: "empty_file" };
  if (file.size > MAX_RESUME_BYTES) return { ok: false, code: "too_large" };
  if (startsWith(file.bytes, PDF_SIGNATURE)) return { ok: true, fileType: "pdf" };
  if (
    startsWith(file.bytes, ZIP_SIGNATURE) &&
    file.name.toLowerCase().endsWith(".docx")
  ) {
    return { ok: true, fileType: "docx" };
  }
  // A file named .pdf without PDF contents is damaged, not the wrong type.
  if (file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, code: "unreadable" };
  }
  return { ok: false, code: "unsupported_type" };
}

/** Too little text to be a resume means a blank or scanned document. */
export function hasUsableText(text: string): boolean {
  return (text.match(/\p{L}/gu)?.length ?? 0) >= 30;
}
