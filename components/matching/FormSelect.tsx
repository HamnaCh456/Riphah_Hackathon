'use client';

import { useState } from 'react';

import { Select } from '@/components/ui/select';

/** The app's dropdown, usable inside a plain form. */
export function FormSelect({ name, label, defaultValue, options }: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="w-44">
      <input type="hidden" name={name} value={value} />
      <Select label={label} value={value} onChange={setValue} options={options} />
    </div>
  );
}
