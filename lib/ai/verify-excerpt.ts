/**
 * Reduces text to its words, because PDFs vary spacing, bullets and quote marks. Words stay
 * separate so "go" isn't found inside "Django", and a trailing + or # stays so C++ isn't C.
 */
function comparableWords(text: string): string {
  const words = text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+[+#]*/gu);
  return words ? ` ${words.join(" ")} ` : "";
}

/** True only when the quote really is in the source. AI output is never trusted on its own. */
export function excerptAppearsIn(
  excerpt: string | null | undefined,
  source: string,
): boolean {
  const quote = comparableWords(excerpt ?? "");
  return quote.length > 0 && comparableWords(source).includes(quote);
}
