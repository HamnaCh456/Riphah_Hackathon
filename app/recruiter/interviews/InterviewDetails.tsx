// app/recruiter/interviews/InterviewDetails.tsx
'use client';
import { useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';
import styles from './interviews.module.css';

/** A row that opens its interview in a pop-up. */
export function InterviewDetails({ title, row, children }: { title: string; row: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.rowLink} onClick={() => setOpen(true)}>{row}</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>{children}</Dialog>
    </>
  );
}
