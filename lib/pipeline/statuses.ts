export const APPLICATION_STATUSES = [
  "submitted",
  "parsed",
  "assessed",
  "in_review",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
