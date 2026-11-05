'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

import { savePreferencesAction } from './actions';

export function ChoicesDialog({ interests, consent }: { interests: string[]; consent: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [interestsText, setInterestsText] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  const openDialog = () => {
    setInterestsText(interests.join(', '));
    setConsentChecked(consent);
    setOpen(true);
  };

  const save = () => start(async () => {
    const data = new FormData();
    data.set('interests', interestsText);
    if (consentChecked) data.set('consent', 'on');
    try {
      const result = await savePreferencesAction(data);
      if (!result.ok) { toast(result.error, { tone: 'error' }); return; }
      toast(result.message);
      setOpen(false);
      router.refresh();
    } catch {
      toast('Something went wrong. Try again.', { tone: 'error' });
    }
  });

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <p className="min-w-0 flex-1 basis-64">
          Interests: {interests.length > 0 ? interests.join(', ') : 'none added'}
          {' · '}
          Recruiters can consider me for other jobs: {consent ? 'Yes' : 'No'}
        </p>
        <Button variant="ghost" size="sm" onClick={openDialog}>Change choices</Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Your choices"
        footer={<Button loading={pending} onClick={save}>Save choices</Button>}
      >
        <label htmlFor="interests" className="mb-1 block font-arial text-sm">
          What kind of work interests you? Separate items with commas.
        </label>
        <Input
          id="interests"
          maxLength={300}
          value={interestsText}
          onChange={(event) => setInterestsText(event.target.value)}
          placeholder="fintech, backend services"
        />
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(event) => setConsentChecked(event.target.checked)}
          />
          Let recruiters I applied to consider my resume for their other jobs
        </label>
        <p className="mt-1 text-sm">
          If you agree, a recruiter can find your resume for 180 days after you
          apply. You can change this at any time.
        </p>
      </Dialog>
    </>
  );
}
