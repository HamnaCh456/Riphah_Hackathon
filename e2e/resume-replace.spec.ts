// e2e/resume-replace.spec.ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { applicationResume, loginAs, resumesOf, seedApplication } from './helpers';

test.setTimeout(240_000);

const pdf = (name: string) => ({
  name, mimeType: 'application/pdf', buffer: readFileSync(`demo/resumes/${name}`),
});

test('a new resume replaces the old skills for the candidate and the recruiter', async ({ page }) => {
  // The seeded application holds an old resume with a Django skill, a score and a Docker row.
  const { applicationId, jobId, candidateId, resumeId } = await seedApplication({ status: 'in_review', useLoginCandidate: true });
  await loginAs(page, 'candidate');
  await page.goto('/candidate/resume');
  await page.getByRole('button', { name: /^Skills/ }).click();
  await expect(page.getByLabel('Remove Django')).toBeVisible();

  // Zara's resume has no Django, so a leftover Django row can only come from the old resume.
  await page.locator('input[type="file"]').setInputFiles(pdf('zara-noor-weak.pdf'));
  await expect(page.getByText('Resume read. Check the details below.')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByLabel('Remove Django')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('zara-noor-weak.pdf')).toBeVisible();
  await expect(page.getByLabel('Remove Django')).toHaveCount(0);

  // Only one resume is left, and the existing application uses it.
  const left = await resumesOf(candidateId);
  expect(left).toHaveLength(1);
  expect(left).not.toContain(resumeId);
  expect(await applicationResume(applicationId)).toBe(left[0]);

  // The recruiter sees the new resume on the existing application, with the old score gone.
  await page.context().clearCookies();
  await loginAs(page, 'recruiter');
  await page.goto(`/recruiter/jobs/${jobId}/applicants/${applicationId}`);
  await expect(page.getByRole('heading', { name: 'History' })).toHaveCount(0);
  await expect(page.getByText('The resume does not mention Docker.')).toHaveCount(0);
  const skills = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Extracted skills' }) });
  await expect(skills).toBeVisible();
  await expect(skills.getByText('Django', { exact: true })).toHaveCount(0);
  await expect(skills.getByText('From resume').first()).toBeVisible();
});

test('a rejected applicant has no reopen and an interview has no back to shortlist', async ({ page }) => {
  const rejected = await seedApplication({ status: 'rejected' });
  const interview = await seedApplication({ status: 'interview' });
  await loginAs(page, 'recruiter');

  await page.goto(`/recruiter/jobs/${rejected.jobId}/applicants/${rejected.applicationId}`);
  await expect(page.getByText('Reopen', { exact: true })).toHaveCount(0);

  await page.goto(`/recruiter/jobs/${interview.jobId}/applicants/${interview.applicationId}`);
  await expect(page.getByText('Back to shortlist', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Select' })).toBeVisible();
});
