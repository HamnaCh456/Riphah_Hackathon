import "server-only";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

import type { ResumeFailureCode, ResumeFileType } from "./file-check";
import { hasUsableText } from "./file-check";

export type TextResult =
  | { ok: true; text: string }
  | { ok: false; code: ResumeFailureCode };

const MAX_TEXT_LENGTH = 60_000;

async function readPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function readDocx(bytes: Uint8Array): Promise<string> {
  const { value } = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });
  return value;
}

export async function extractResumeText(
  bytes: Uint8Array,
  fileType: ResumeFileType,
): Promise<TextResult> {
  try {
    const text = fileType === "pdf" ? await readPdf(bytes) : await readDocx(bytes);
    if (!hasUsableText(text)) return { ok: false, code: "no_text" };
    return { ok: true, text: text.trim().slice(0, MAX_TEXT_LENGTH) };
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      return { ok: false, code: "password_protected" };
    }
    console.error("Resume text extraction failed", error);
    return { ok: false, code: "unreadable" };
  }
}
