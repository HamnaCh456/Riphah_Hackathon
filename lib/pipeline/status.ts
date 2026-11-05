export type ApplicationStatus =
  | 'submitted' | 'parsed' | 'assessed' | 'in_review' | 'shortlisted' | 'interview' | 'selected' | 'rejected';

export interface MoveOption { to: ApplicationStatus; label: string; requiresReason: boolean; primary?: boolean }

const REVIEW: MoveOption = { to: 'in_review', label: 'Start review', requiresReason: false };
const SHORTLIST: MoveOption = { to: 'shortlisted', label: 'Shortlist', requiresReason: false, primary: true };
const REJECT: MoveOption = { to: 'rejected', label: 'Reject', requiresReason: true };

export const RECRUITER_MOVES: Record<ApplicationStatus, MoveOption[]> = {
  submitted: [REVIEW, SHORTLIST, REJECT],
  parsed: [REVIEW, SHORTLIST, REJECT],
  assessed: [REVIEW, SHORTLIST, REJECT],
  in_review: [SHORTLIST, REJECT],
  shortlisted: [
    { to: 'interview', label: 'Move to interview', requiresReason: false, primary: true },
    REJECT,
    { to: 'in_review', label: 'Undo shortlist', requiresReason: true },
  ],
  interview: [
    { to: 'selected', label: 'Select', requiresReason: false, primary: true },
    REJECT,
    { to: 'shortlisted', label: 'Back to shortlist', requiresReason: true },
  ],
  selected: [{ to: 'interview', label: 'Undo selection', requiresReason: true }],
  rejected: [{ to: 'in_review', label: 'Reopen', requiresReason: true }],
};

export const PUBLIC_STATUS: Record<string, { label: string; help: string }> = {
  submitted: { label: 'Submitted', help: 'We have your application.' },
  under_review: { label: 'Under review', help: 'The hiring team is looking at your application.' },
  shortlisted: { label: 'Shortlisted', help: 'You have moved forward. The team will contact you about next steps.' },
  interview: { label: 'Interview', help: 'You are at the interview stage.' },
  selected: { label: 'Selected', help: 'Congratulations, you have been selected for this role.' },
  not_selected: { label: 'Not selected', help: 'The team has not moved forward with this application.' },
};
