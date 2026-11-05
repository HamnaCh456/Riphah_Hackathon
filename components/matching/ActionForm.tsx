'use client';

import { useRouter } from 'next/navigation';
import { useTransition, type ReactNode } from 'react';

import { useToast } from '@/components/ui/toast';

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** Runs a server action, reports the result as a toast and refreshes the screen. */
export function ActionForm({ action, reset, className, children }: {
  action: (data: FormData) => Promise<ActionResult>;
  reset?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  return (
    <form
      className={className}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        // Passing the submitter keeps the clicked button's name and value (Rename or Remove).
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(form, submitter);
        // Shows the spinner on the button that was pressed (styled in globals.css).
        submitter?.setAttribute('data-busy', '');
        start(async () => {
          try {
            const result = await action(data);
            if (!result.ok) {
              toast(result.error, { tone: 'error' });
              return;
            }
            if (result.message) toast(result.message);
            if (reset) form.reset();
            router.refresh();
          } catch {
            toast('Something went wrong. Try again.', { tone: 'error' });
          } finally {
            submitter?.removeAttribute('data-busy');
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">{children}</fieldset>
    </form>
  );
}
