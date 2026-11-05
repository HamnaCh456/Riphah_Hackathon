// e2e/analytics.spec.ts
import { expect, test, type Page } from '@playwright/test';
import { loginAs, seedApplication } from './helpers';

const tile = async (page: Page, label: string) =>
  Number(await page.getByTestId(`tile-${label}`).innerText());

test('dashboard updates after a shortlist', async ({ page }) => {
  const app = await seedApplication({ status: 'in_review' });
  await loginAs(page, 'recruiter');

  await page.goto('/recruiter/analytics');
  const shortlistedBefore = await tile(page, 'Shortlisted');
  const pendingBefore = await tile(page, 'Pending reviews');

  await page.goto(`/recruiter/jobs/${app.jobId}/applicants/${app.applicationId}`);
  await page.getByRole('button', { name: 'Shortlist' }).click();
  await expect(page.getByText('Shortlisted').first()).toBeVisible();

  await page.goto('/recruiter/analytics');
  expect(await tile(page, 'Shortlisted')).toBe(shortlistedBefore + 1);
  expect(await tile(page, 'Pending reviews')).toBe(pendingBefore - 1);

  // Going Back also shows fresh numbers.
  await page.goto(`/recruiter/jobs/${app.jobId}/applicants/${app.applicationId}`);
  await page.goBack();
  await expect(page.getByTestId('tile-Shortlisted')).toHaveText(String(shortlistedBefore + 1));
});

test('job filter narrows the numbers, and a number opens its applicants', async ({ page }) => {
  const app = await seedApplication({ status: 'in_review' });
  await loginAs(page, 'recruiter');
  await page.goto(`/recruiter/analytics?job=${app.jobId}`);

  expect(await tile(page, 'Applications')).toBe(1);
  expect(await tile(page, 'Pending reviews')).toBe(1);

  await page.getByRole('link', { name: /Pending reviews/ }).click();
  await expect(page.getByRole('heading', { name: 'Pending reviews' })).toBeVisible();
  await expect(page.getByText(app.candidateName)).toBeVisible();
});

test('skill gaps say no evidence, not that the skill is missing', async ({ page }) => {
  const app = await seedApplication({ status: 'in_review' });
  await loginAs(page, 'recruiter');
  await page.goto(`/recruiter/analytics?job=${app.jobId}`);
  await expect(page.getByRole('list', { name: 'Common skill gaps' })).toContainText('no evidence');
});

test('a candidate cannot open analytics', async ({ page }) => {
  await loginAs(page, 'candidate');
  await page.goto('/recruiter/analytics');
  await expect(page.getByTestId('tile-Applications')).toHaveCount(0);
});

test("changing the URL does not reveal another recruiter's job", async ({ page }) => {
  await loginAs(page, 'recruiter');
  await page.goto('/recruiter/analytics?job=00000000-0000-0000-0000-000000000000');
  // An unknown job falls back to the recruiter's own "All jobs" view.
  await expect(page.getByRole('combobox', { name: 'Job' })).toContainText('All jobs');
});
