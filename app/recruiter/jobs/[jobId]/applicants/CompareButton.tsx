'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const TICKED = 'input[name="a"][form="compare-form"]:checked';

/** Counts the ticked rows, and only opens the comparison when there are 2 to 4. */
export function CompareButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const recount = () => setCount(document.querySelectorAll(TICKED).length);
    recount();
    document.addEventListener('change', recount);
    return () => document.removeEventListener('change', recount);
  }, []);

  const ready = count >= 2 && count <= 4;
  return (
    <span title={ready ? undefined : 'Tick 2 to 4 assessed applicants to compare them'}>
      <Button type="submit" variant="ghost" size="sm" disabled={!ready}>
        {count > 0 ? `Compare (${count})` : 'Compare'}
      </Button>
    </span>
  );
}
