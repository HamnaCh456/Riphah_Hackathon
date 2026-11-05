import type { MatchStatus } from '@/lib/matching/types';

export const MATCH_LABELS: Record<MatchStatus, { word: string; help: string }> = {
  matched: { word: 'Backed by resume', help: 'The resume shows this.' },
  partial: { word: 'Related experience', help: 'The resume shows something close, not this exact skill.' },
  no_evidence: { word: 'Not mentioned', help: 'The resume does not mention this. They may still have it, so ask them.' },
  confirmed_absent: { word: 'Confirmed missing', help: 'The resume or a recruiter states they do not have this.' },
};

export const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  parsed: 'Resume read',
  assessed: 'AI assessment ready',
  in_review: 'In review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  selected: 'Selected',
  rejected: 'Rejected',
};

/** Same format everywhere, so a time reads the same on the server and in the browser. */
export const formatTime = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })} UTC`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
