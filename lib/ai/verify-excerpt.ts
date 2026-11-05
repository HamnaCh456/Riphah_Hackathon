/** Reduces text to letters, digits, + and #, because PDFs vary spacing, bullets and quote marks. */
function comparable(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#]/gu, "");
}

/** True only when the quote really is in the source. AI output is never trusted on its own. */
export function excerptAppearsIn(
  excerpt: string | null | undefined,
  source: string,
): boolean {
  const quote = comparable(excerpt ?? "");
  return quote.length >= 2 && comparable(source).includes(quote);
}
