// e2e/interview-questions.spec.ts
import { expect, test } from '@playwright/test';
import { loginAs, seedApplication } from './helpers';

test.setTimeout(120_000);

test('a job gets one set of questions, made only when the recruiter clicks', async ({ page }) => {
  const { jobId, applicationId } = await seedApplication({ status: 'in_review' });
  await loginAs(page, 'recruiter');

  // Opening the page generates nothing.
  await page.goto(`/recruiter/jobs/${jobId}/questions`);
  await expect(page.getByText('No questions yet')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No questions yet')).toBeVisible();

  await page.getByRole('button', { name: 'Generate questions' }).click();
  await expect(page.getByText('Beginner', { exact: false }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Intermediate', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Advanced', { exact: false }).first()).toBeVisible();

  // Generated once: the button is gone, and nothing regenerates.
  await expect(page.getByRole('button', { name: 'Generate questions' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /regenerate/i })).toHaveCount(0);

  const first = page.getByRole('listitem').filter({ hasText: 'Answer guidelines' }).first();
  await first.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Question').fill('My own question about Django?');
  await page.getByRole('button', { name: 'Save question' }).click();
  await expect(page.getByText('Question saved')).toBeVisible();

  // Saved in the database, and reached from the applicant's page.
  await page.goto(`/recruiter/jobs/${jobId}/applicants/${applicationId}`);
  await page.getByRole('link', { name: 'Interview questions' }).click();
  await expect(page).toHaveURL(new RegExp(`/recruiter/jobs/${jobId}/questions`));
  await expect(page.getByText('My own question about Django?')).toBeVisible();

  const row = page.getByRole('listitem').filter({ hasText: 'My own question about Django?' });
  await row.getByRole('button', { name: 'Remove' }).click();
  await row.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('My own question about Django?')).toHaveCount(0);
});

test('candidate cannot open the questions page', async ({ page }) => {
  const { jobId } = await seedApplication({ status: 'shortlisted' });
  await loginAs(page, 'candidate');
  const response = await page.goto(`/recruiter/jobs/${jobId}/questions`);
  expect(page.url().includes('/questions') ? response?.status() : 403).not.toBe(200);
  await expect(page.getByText('Answer guidelines')).toHaveCount(0);
});
