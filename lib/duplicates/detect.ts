const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"];
const PHONE_DIGITS = 10;
export const DOCUMENT_SIMILARITY_THRESHOLD = 0.85;

export function normalizeEmail(email: string | null | undefined): string | null {
  const clean = email?.trim().toLowerCase();
  if (!clean) return null;
  const parts = clean.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (GMAIL_DOMAINS.includes(parts[1])) {
    return `${parts[0].split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return clean;
}

/** Compares the last 10 digits, so +92, 0092 and 0 prefixes all match. */
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= PHONE_DIGITS ? digits.slice(-PHONE_DIGITS) : null;
}

function wordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}+#]+/gu) ?? []);
}

/** Share of distinct words two documents have in common, from 0 to 1. */
export function documentSimilarity(a: string, b: string): number {
  const first = wordSet(a);
  const second = wordSet(b);
  if (first.size === 0 || second.size === 0) return 0;
  let shared = 0;
  for (const word of first) if (second.has(word)) shared++;
  return shared / (first.size + second.size - shared);
}

export type DuplicateRecord = {
  candidateId: string;
  name: string;
  emails: string[];
  phones: string[];
  resumeText: string;
};

export type DuplicatePair = { a: DuplicateRecord; b: DuplicateRecord; reasons: string[] };

/** Names aren't a signal, because two different people can share one. This changes nothing. */
export function findDuplicatePairs(records: DuplicateRecord[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const [a, b] = [records[i], records[j]];
      const emailsA = new Set(a.emails.map(normalizeEmail).filter(Boolean));
      const phonesA = new Set(a.phones.map(normalizePhone).filter(Boolean));
      const reasons: string[] = [];
      if (b.emails.some((e) => emailsA.has(normalizeEmail(e)))) {
        reasons.push("Same email address");
      }
      if (b.phones.some((p) => phonesA.has(normalizePhone(p)))) {
        reasons.push("Same phone number");
      }
      const similarity = documentSimilarity(a.resumeText, b.resumeText);
      if (similarity >= DOCUMENT_SIMILARITY_THRESHOLD) {
        reasons.push(`Resumes are ${Math.round(similarity * 100)}% the same`);
      }
      if (reasons.length > 0) pairs.push({ a, b, reasons });
    }
  }
  return pairs;
}
