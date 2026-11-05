// e2e/interview-questions.spec.ts
import { expect, test } from '@playwright/test';
import { loginAs, seedApplication } from './helpers';

test.setTimeout(120_000);

test('recruiter generates, edits, regenerates and removes questions', async ({ page }) => {
  const { applicationId } = await seedApplication({ status: 'shortlisted' });
  await loginAs(page, 'recruiter');
  await page.goto(`/recruiter/applications/${applicationId}/questions`);

  await page.getByRole('button', { name: 'Generate questions' }).click();
  await expect(page.getByText('Beginner', { exact: false }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Intermediate', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Advanced', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Candidate projects' })).toBeVisible();

  const first = page.getByRole('listitem').first();
  await first.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Question').fill('My own question about Django?');
  await page.getByRole('button', { name: 'Save question' }).click();
  await expect(page.getByText('My own question about Django?')).toBeVisible();

  // Saved in the database, not only on screen.
  await page.reload();
  await expect(page.getByText('My own question about Django?')).toBeVisible();

  // Regenerate all keeps the edited question.
  await page.getByRole('button', { name: 'Regenerate all' }).click();
  await expect(page.getByText('Questions ready')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('My own question about Django?')).toBeVisible();

  const row = page.getByRole('listitem').filter({ hasText: 'My own question about Django?' });
  await row.getByRole('button', { name: 'Remove' }).click();
  await row.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('My own question about Django?')).toHaveCount(0);
});

test('candidate cannot open the questions page', async ({ page }) => {
  const { applicationId } = await seedApplication({ status: 'shortlisted' });
  await loginAs(page, 'candidate');
  const response = await page.goto(`/recruiter/applications/${applicationId}/questions`);
  expect(page.url().includes('/questions') ? response?.status() : 403).not.toBe(200);
  await expect(page.getByText('Answer guidelines')).toHaveCount(0);
});

test('applicant who is not shortlisted gets no generate button', async ({ page }) => {
  const { applicationId } = await seedApplication({ status: 'in_review' });
  await loginAs(page, 'recruiter');
  await page.goto(`/recruiter/applications/${applicationId}/questions`);
  await expect(page.getByRole('button', { name: 'Generate questions' })).toHaveCount(0);
  await expect(page.getByText('Shortlist this applicant')).toBeVisible();
});
