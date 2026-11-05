const PERSONAL_LINE =
  /^[ \t]*(date of birth|dob|age|gender|sex|marital status|nationality|religion|caste|cnic|father'?s? name|husband'?s? name|blood group|domicile)\b.*$/gim;
// A separator is required here, so "Address customer tickets" stays.
const LABELLED_PERSONAL =
  /^[ \t]*(name|full name|race|ethnicity|disability|sect|citizenship|passport(?: no\.?| number)?|address|photo)[ \t]*[:\-–].*$/gim;
const TITLE = /\b(?:Mr|Mrs|Ms|Miss|Mx)\.?\s+(?=\[name\]|[A-Z])/g;
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const PROFILE_URL = /\b(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com)\/\S+/gi;
const PHONE = /\+\d{1,3}[\s-]?\d[\d\s-]{7,}\d|\b0\d{2,3}[\s-]?\d{7}\b|\(?\b\d{3}\)?[\s-]\d{3}[\s-]\d{4}\b/g;

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Runs before embedding and before Gemini, so these details cannot affect a score.
export function redact(text: string, candidateName: string | null): string {
  let out = text.replace(PERSONAL_LINE, '').replace(LABELLED_PERSONAL, '').replace(EMAIL, '[contact]')
    .replace(PROFILE_URL, '[contact]').replace(PHONE, '[contact]');
  for (const part of (candidateName ?? '').split(/\s+/).filter((p) => p.length > 1)) {
    out = out.replace(new RegExp(`\\b${escapeRegex(part)}\\b`, 'gi'), '[name]');
  }
  return out.replace(TITLE, '').replace(/\n{3,}/g, '\n\n');
}
