"use client";

import { useId, useState } from "react";

import { ItemAccordion, ResumeAccordion } from "@/components/resume/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type Provenance = {
  id: string;
  excerpt: string | null;
  verified: boolean;
  source: "resume" | "candidate";
  edited: boolean;
};

type Field<T> = {
  key: keyof T & string;
  label: string;
  /** Takes the full row. */
  wide?: boolean;
  /** A multi-line box. */
  long?: boolean;
};

/** One editable list: experience, projects or education. Each entry opens on its own. */
export function ResumeSection<T extends Provenance>({
  title,
  addLabel,
  items,
  fields,
  blank,
  metaOf,
  onChange,
}: {
  title: string;
  addLabel: string;
  items: T[];
  fields: Field<T>[];
  blank: Omit<T, keyof Provenance>;
  /** The short detail beside an entry's name when it's closed. */
  metaOf: (item: T) => string;
  onChange: (update: (items: T[]) => T[]) => void;
}) {
  const baseId = useId();
  const toast = useToast();
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const [addedId, setAddedId] = useState<string | null>(null);

  const nameOf = (item: T) => String(item[fields[0].key] ?? "").trim();

  function toggle(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function add() {
    const id = crypto.randomUUID();
    onChange((current) => [
      ...current,
      {
        ...blank,
        id,
        excerpt: null,
        verified: false,
        source: "candidate",
        edited: false,
      } as unknown as T,
    ]);
    setOpenIds((current) => new Set(current).add(id));
    setAddedId(id);
  }

  function remove(item: T, index: number) {
    onChange((current) => current.filter((other) => other.id !== item.id));
    const hasContent = fields.some((field) => String(item[field.key] ?? "").trim());
    if (!hasContent) return;
    toast(`Removed ${nameOf(item) || "entry"}`, {
      action: {
        label: "Undo",
        onClick: () =>
          onChange((current) => [...current.slice(0, index), item, ...current.slice(index)]),
      },
    });
  }

  const isFlagged = (item: T) => item.source === "resume" && !item.verified;

  return (
    <ResumeAccordion
      title={title}
      count={items.length}
      summary={items.map(nameOf).filter(Boolean).join(", ") || "None found in your resume."}
      flagged={items.filter(isFlagged).length}
    >
      <ul>
        {items.map((item, index) => (
          <ItemAccordion
            key={item.id}
            open={openIds.has(item.id)}
            onToggle={() => toggle(item.id)}
            title={nameOf(item) || "New entry"}
            meta={metaOf(item)}
            flag={isFlagged(item) ? "Check this" : undefined}
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              {fields.map((field, fieldIndex) => {
                const id = `${baseId}-${item.id}-${field.key}`;
                const value = String(item[field.key] ?? "");
                const change = (next: string) =>
                  onChange((current) =>
                    current.map((other) =>
                      other.id === item.id ? { ...other, [field.key]: next } : other,
                    ),
                  );
                const focusFirst = fieldIndex === 0 && addedId === item.id;
                return (
                  <div key={field.key} className={field.long || field.wide ? "sm:col-span-2" : undefined}>
                    <Label htmlFor={id} className="text-xs">{field.label}</Label>
                    {field.long ? (
                      <textarea
                        id={id}
                        rows={4}
                        value={value}
                        onChange={(event) => change(event.target.value)}
                        className="mt-1 block w-full resize-y rounded-small border border-hairline bg-surface p-2.5 font-arial text-sm leading-relaxed text-ink transition-colors hover:border-hairline-strong focus:border-muted"
                      />
                    ) : (
                      <Input
                        id={id}
                        value={value}
                        autoFocus={focusFirst}
                        onChange={(event) => change(event.target.value)}
                        className="mt-1 h-9"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {item.excerpt && (
              <p className="mt-2 border-l-2 border-gold pl-2.5 font-mono text-xs leading-relaxed">
                {item.excerpt}
              </p>
            )}
            {isFlagged(item) && (
              <p className="mt-1 font-arial text-sm text-danger">
                Not found in your resume. Check or remove this.
              </p>
            )}

            <div className="mt-2 flex items-center justify-between gap-3 font-arial text-xs">
              <span>{item.source === "candidate" ? "Added by you" : item.edited ? "Edited by you" : ""}</span>
              <button
                type="button"
                aria-label={`Remove ${nameOf(item) || `${title} entry ${index + 1}`}`}
                className="textlink cursor-pointer"
                onClick={() => remove(item, index)}
              >
                Remove
              </button>
            </div>
          </ItemAccordion>
        ))}
      </ul>
      <button
        type="button"
        className="textlink mt-2.5 cursor-pointer font-arial text-sm"
        onClick={add}
      >
        {addLabel}
      </button>
    </ResumeAccordion>
  );
}
