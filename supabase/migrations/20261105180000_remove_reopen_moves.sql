-- Recruiters can no longer move an applicant back to the shortlist or reopen a rejected one.
-- change_application_status refuses any move not listed here.
-- Rollback: insert these two rows again, both with actor 'recruiter' and requires_reason true.
delete from public.application_transitions
where (from_status, to_status) in (('interview', 'shortlisted'), ('rejected', 'in_review'));
