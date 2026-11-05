"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Provenance = {
  id: string;
  excerpt: string | null;
  verified: boolean;
  source: "resume" | "candidate";
  edited: boolean;
};

type Field<T> = { key: keyof T & string; label: string; long?: boolean };

/** One editable list: experience, projects or education. */
export function ResumeSection<T extends Provenance>({
  title,
  addLabel,
  items,
  fields,
  blank,
  onChange,
}: {
  title: string;
  addLabel: string;
  items: T[];
  fields: Field<T>[];
  blank: Omit<T, keyof Provenance>;
  onChange: (items: T[]) => void;
}) {
  const baseId = useId();

  return (
    <section aria-label={title}>
      <h2 className="border-b pb-2 text-base">{title}</h2>
      {items.length === 0 && (
        <p className="mt-2 text-sm">None found in your resume.</p>
      )}
      <ul>
        {items.map((item, index) => {
          const itemName = String(item[fields[0].key] || `${title} entry ${index + 1}`);
          return (
            <li key={item.id} className="border-b border-hairline-soft py-3">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {fields.map((field) => {
                  const id = `${baseId}-${item.id}-${field.key}`;
                  const value = String(item[field.key] ?? "");
                  const change = (next: string) =>
                    onChange(
                      items.map((other) =>
                        other.id === item.id ? { ...other, [field.key]: next } : other,
                      ),
                    );
                  return (
                    <div key={field.key} className={field.long ? "sm:col-span-2" : undefined}>
                      <Label htmlFor={id} className="text-xs">{field.label}</Label>
                      {field.long ? (
                        <textarea
                          id={id}
                          rows={3}
                          value={value}
                          onChange={(event) => change(event.target.value)}
                          className="mt-1 block w-full resize-y rounded-small border border-hairline bg-deep p-2.5 font-arial text-sm leading-relaxed text-mist transition-colors hover:border-hairline-strong focus:border-silver"
                        />
                      ) : (
                        <Input
                          id={id}
                          value={value}
                          onChange={(event) => change(event.target.value)}
                          className="mt-1 h-9"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {item.excerpt && (
                <p className="mt-2 border-l-2 border-citrine pl-2.5 font-mono text-xs leading-relaxed">
                  {item.excerpt}
                </p>
              )}
              {item.source === "resume" && !item.verified && (
                <p className="mt-1 font-arial text-sm text-coral">
                  Not found in your resume. Check or remove this.
                </p>
              )}

              <div className="mt-2 flex items-center justify-between gap-3 font-arial text-xs">
                <span>{item.source === "candidate" ? "Added by you" : item.edited ? "Edited by you" : ""}</span>
                <button
                  type="button"
                  aria-label={`Remove ${itemName}`}
                  className="textlink cursor-pointer"
                  onClick={() => onChange(items.filter((other) => other.id !== item.id))}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="textlink mt-2.5 cursor-pointer font-arial text-sm"
        onClick={() =>
          onChange([
            ...items,
            {
              ...blank,
              id: crypto.randomUUID(),
              excerpt: null,
              verified: false,
              source: "candidate",
              edited: false,
            } as unknown as T,
          ])
        }
      >
        {addLabel}
      </button>
    </section>
  );
}
