import { describe, expect, it } from "vitest";

import { checkResumeFile, hasUsableText, MAX_RESUME_BYTES } from "./file-check";

const bytes = (text: string) => new TextEncoder().encode(text);
const file = (name: string, content: string) => ({
  name,
  size: content.length,
  bytes: bytes(content),
});

describe("checkResumeFile", () => {
  it("accepts a real PDF, whatever it is called", () => {
    expect(checkResumeFile(file("cv.pdf", "%PDF-1.7 data"))).toEqual({ ok: true, fileType: "pdf" });
    expect(checkResumeFile(file("cv", "%PDF-1.7 data"))).toEqual({ ok: true, fileType: "pdf" });
  });

  it("accepts a DOCX", () => {
    expect(checkResumeFile(file("cv.docx", "PK\x03\x04 data"))).toEqual({ ok: true, fileType: "docx" });
  });

  it("rejects other zip files", () => {
    expect(checkResumeFile(file("photos.zip", "PK\x03\x04 data"))).toEqual({ ok: false, code: "unsupported_type" });
  });

  it("rejects wrong types", () => {
    expect(checkResumeFile(file("cv.txt", "hello"))).toEqual({ ok: false, code: "unsupported_type" });
    expect(checkResumeFile(file("cv.jpg", "\xff\xd8\xff"))).toEqual({ ok: false, code: "unsupported_type" });
  });

  it("calls a .pdf with other contents damaged", () => {
    expect(checkResumeFile(file("cv.pdf", "not a pdf"))).toEqual({ ok: false, code: "unreadable" });
  });

  it("rejects empty and oversized files", () => {
    expect(checkResumeFile(file("cv.pdf", ""))).toEqual({ ok: false, code: "empty_file" });
    expect(
      checkResumeFile({ name: "cv.pdf", size: MAX_RESUME_BYTES + 1, bytes: bytes("%PDF-") }),
    ).toEqual({ ok: false, code: "too_large" });
  });
});

describe("hasUsableText", () => {
  it("rejects blank text and page numbers", () => {
    expect(hasUsableText("  \n ")).toBe(false);
    expect(hasUsableText("1 2 3 Page 1")).toBe(false);
  });

  it("accepts real content", () => {
    expect(hasUsableText("Senior software engineer with Python and Django")).toBe(true);
  });
});
