// e2e/scheduling.spec.ts
import { expect, test, type Page } from '@playwright/test';
import { loginAs, seedApplication } from './helpers';

// A different future date on each run, so a rerun doesn't clash with interviews from earlier runs.
const testDate = new Date(Date.now() + (2 + Math.floor(Math.random() * 300)) * 86_400_000)
  .toISOString().slice(0, 10);

async function pick(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function fillSchedule(page: Page, applicationId: string, interviewer: string, time: string, isNew: boolean) {
  // Old interview links land on the applicant's page, where Move to interview opens the pop-up.
  await page.goto(`/recruiter/applications/${applicationId}/interview`);
  await page.getByRole('button', { name: 'Move to interview' }).click();
  await page.getByLabel('Date').fill(testDate);
  await pick(page, 'Time (PKT)', time);
  if (isNew) {
    await pick(page, 'Interviewer', 'Add new interviewer');
    await page.getByLabel('New interviewer’s name').fill(interviewer);
  } else {
    await pick(page, 'Interviewer', interviewer);
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Schedule interview' }).click();
}

test('double-booked interviewer is flagged, and the recruiter decides', async ({ page }) => {
  const interviewer = `Ali ${Date.now()}`;
  const first = await seedApplication({ status: 'shortlisted' });
  const second = await seedApplication({ status: 'shortlisted' });
  await loginAs(page, 'recruiter');

  await fillSchedule(page, first.applicationId, interviewer, '10:00', true);
  await expect(page.getByText('Interview scheduled')).toBeVisible();

  // Same interviewer, overlapping time: warned and NOT saved yet.
  await fillSchedule(page, second.applicationId, interviewer, '10:30', false);
  await expect(page.getByRole('alert')).toContainText(`${interviewer} already has an interview`);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Move to interview' })).toBeVisible();

  await fillSchedule(page, second.applicationId, interviewer, '10:30', false);
  await page.getByRole('button', { name: 'Schedule anyway' }).click();
  await expect(page.getByText('Interview scheduled')).toBeVisible();

  // Both rows are flagged on the schedule.
  await page.goto('/recruiter/interviews');
  await expect(page.getByText(`Conflict: ${interviewer} is also booked`)).toHaveCount(2);
});

test('moving to interview needs no second step, and can be left without a date', async ({ page }) => {
  const app = await seedApplication({ status: 'shortlisted' });
  await loginAs(page, 'recruiter');
  const url = `/recruiter/jobs/${app.jobId}/applicants/${app.applicationId}`;
  await page.goto(url);

  await page.getByRole('button', { name: 'Move to interview' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Schedule later' }).click();
  await expect(page.getByText('No interview scheduled yet.')).toBeVisible();
  await page.reload();

  // Still on the same page, the panel schedules it in a pop-up.
  await expect(page.getByText('No interview scheduled yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Schedule interview' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(url);
});

test('feedback and decision stay hidden from the candidate', async ({ page, browser }) => {
  const app = await seedApplication({ status: 'shortlisted', useLoginCandidate: true });
  await loginAs(page, 'recruiter');
  await fillSchedule(page, app.applicationId, `Sara ${Date.now()}`, '14:00', true);
  await expect(page.getByText('Interview scheduled')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Add feedback' }).click();
  for (const label of ['Technical skill', 'Problem solving', 'Communication', 'Job knowledge']) {
    await page.getByRole('radio', { name: `${label}: 4 out of 5` }).click();
  }
  await pick(page, 'Recommendation', 'Advance');
  await page.getByLabel('Concerns').fill('SECRET-FEEDBACK-TEXT');
  await page.getByRole('button', { name: 'Save feedback' }).click();
  await expect(page.getByText('Feedback saved')).toBeVisible();
  await expect(page.getByText('SECRET-FEEDBACK-TEXT')).toBeVisible();

  await page.reload();
  await expect(page.getByText('SECRET-FEEDBACK-TEXT')).toBeVisible();

  await page.getByRole('button', { name: 'Select', exact: true }).click();
  await page.getByLabel('Reason (not shown to the candidate)').fill('SECRET-REASON-TEXT');
  await page.getByRole('dialog').getByRole('button', { name: 'Select candidate' }).click();
  await expect(page.getByRole('button', { name: 'Undo selection' })).toBeVisible();

  const candidate = await (await browser.newContext()).newPage();
  await loginAs(candidate, 'candidate');
  await candidate.goto('/candidate/applications');
  await expect(candidate.getByText('You have been selected for this role.').first()).toBeVisible();
  await expect(candidate.getByText('SECRET-FEEDBACK-TEXT')).toHaveCount(0);
  await expect(candidate.getByText('SECRET-REASON-TEXT')).toHaveCount(0);

  // Recruiter pages are blocked too.
  await candidate.goto(`/recruiter/applications/${app.applicationId}/interview`);
  await expect(candidate.getByText('SECRET-FEEDBACK-TEXT')).toHaveCount(0);
});
