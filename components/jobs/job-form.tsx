"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  extractRequirements,
  saveJob,
} from "@/app/recruiter/jobs/actions";
import { JobStatusButton } from "@/components/jobs/job-status-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import type { JobDetail } from "@/lib/jobs/queries";
import {
  EMPLOYMENT_TYPES,
  type JobFieldErrors,
  type RequirementKind,
} from "@/lib/jobs/schema";

type Row = {
  key: number;
  id?: string;
  kind: RequirementKind;
  label: string;
  importance: number;
  isRequired: boolean;
  quote?: string;
  verified?: boolean;
};

const SECTIONS: { kind: RequirementKind; title: string; placeholder: string; add: string }[] = [
  { kind: "skill", title: "Skills", placeholder: "e.g. Python", add: "Add skill" },
  { kind: "experience", title: "Experience", placeholder: "e.g. 3+ years of backend work", add: "Add experience" },
  { kind: "qualification", title: "Qualifications", placeholder: "e.g. BS in Computer Science", add: "Add qualification" },
];

const IMPORTANCE = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));
const NEED = [
  { value: "required", label: "Required" },
  { value: "preferred", label: "Preferred" },
] as const;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 font-arial text-sm text-coral">
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      <Input
        id={id}
        value={value}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10"
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function JobForm({ job }: { job?: JobDetail }) {
  const router = useRouter();
  const toast = useToast();
  const nextKey = useRef(job?.requirements.length ?? 0);
  const newRowInput = useRef<RequirementKind | null>(null);

  const [title, setTitle] = useState(job?.title ?? "");
  const [department, setDepartment] = useState(job?.department ?? "");
  const [location, setLocation] = useState(job?.location ?? "");
  const [employmentType, setEmploymentType] = useState(
    job?.employmentType ?? "full_time",
  );
  const [salary, setSalary] = useState(job?.salary ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [rows, setRows] = useState<Row[]>(
    job?.requirements.map((r, i) => ({ ...r, key: i })) ?? [],
  );
  const [errors, setErrors] = useState<JobFieldErrors>({});
  const [isSaving, startSaving] = useTransition();
  const [isReading, startReading] = useTransition();

  const updateRow = (key: number, change: Partial<Row>) =>
    setRows((current) =>
      current.map((row) =>
        row.key === key
          ? // Once edited, the wording is the recruiter's, so the AI quote no longer applies.
            { ...row, ...change, ...("label" in change ? { quote: undefined, verified: undefined } : {}) }
          : row,
      ),
    );

  function addRow(kind: RequirementKind) {
    newRowInput.current = kind;
    setRows((current) => [
      ...current,
      { key: nextKey.current++, kind, label: "", importance: 3, isRequired: true },
    ]);
  }

  /** Fills only what is still empty, so nothing the recruiter typed gets overwritten. */
  function fillFromDescription() {
    startReading(async () => {
      const result = await extractRequirements(description);
      if (!result.ok) {
        toast(result.error, { tone: "error" });
        return;
      }

      const { job: found } = result;
      if (found.title && !title.trim()) setTitle(found.title);
      if (found.department && !department.trim()) setDepartment(found.department);
      if (found.location && !location.trim()) setLocation(found.location);
      if (found.salary && !salary.trim()) setSalary(found.salary);
      if (found.employmentType && !job) setEmploymentType(found.employmentType);

      const known = new Set(
        rows.map((r) => `${r.kind}:${r.label.trim().toLowerCase()}`),
      );
      const added = found.requirements.filter(
        (r) => !known.has(`${r.kind}:${r.label.toLowerCase()}`),
      );
      setRows((current) => [
        ...current.filter((r) => r.label.trim()),
        ...added.map((r) => ({ ...r, key: nextKey.current++ })),
      ]);
      setErrors({});
      toast(
        added.length
          ? `Added ${added.length} requirement${added.length === 1 ? "" : "s"}. Check them before saving.`
          : "No new requirements found in the description.",
      );
    });
  }

  function save() {
    startSaving(async () => {
      const result = await saveJob(job?.id ?? null, {
        title,
        department,
        location,
        employmentType,
        salary,
        description,
        requirements: rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          label: row.label,
          importance: row.importance,
          isRequired: row.isRequired,
        })),
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast(result.error, { tone: "error" });
        return;
      }
      toast(job ? "Job saved" : "Job posted");
      router.push("/recruiter/jobs");
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="sticky top-0 z-10 -mx-5 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b bg-abyss px-5 py-3 lg:-mx-10 lg:px-10">
        <div className="flex min-w-0 items-baseline gap-2">
          <Link href="/recruiter/jobs" className="textlink shrink-0 font-arial text-sm">
            Jobs
          </Link>
          <span aria-hidden="true">/</span>
          <h1 className="truncate text-xl">{job ? job.title : "New job"}</h1>
          {job?.status === "closed" && (
            <span className="shrink-0 font-arial text-sm">Closed</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {job && <JobStatusButton jobId={job.id} status={job.status} />}
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? "Saving..." : job ? "Save job" : "Post job"}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="lg:sticky lg:top-[68px] lg:self-start">
          <Label htmlFor="job-description">
            Job description<span aria-hidden="true"> *</span>
          </Label>
          <textarea
            id="job-description"
            value={description}
            required
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "job-description-error" : undefined}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Paste the job description here"
            className="mt-1.5 block h-[42svh] min-h-56 w-full resize-y rounded-small border border-hairline bg-deep p-3.5 font-arial text-sm leading-relaxed text-mist transition-colors placeholder:text-silver/70 hover:border-hairline-strong focus:border-silver lg:h-[calc(100svh-190px)]"
          />
          <FieldError id="job-description-error" message={errors.description} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3"
            disabled={isReading}
            onClick={fillFromDescription}
          >
            {isReading ? "Reading description..." : "Fill fields from description"}
          </Button>
        </div>

        <div className="min-w-0 space-y-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="job-title" label="Job title" value={title} onChange={setTitle} error={errors.title} required />
            </div>
            <Field id="job-department" label="Department" value={department} onChange={setDepartment} error={errors.department} />
            <Field id="job-location" label="Location" value={location} onChange={setLocation} error={errors.location} />
            <div className="sm:col-span-2">
              <Field id="job-salary" label="Salary" value={salary} onChange={setSalary} error={errors.salary} />
            </div>
            <div className="sm:col-span-2">
              <span className="font-arial text-sm">Job type</span>
              <Segmented
                label="Job type"
                value={employmentType}
                options={EMPLOYMENT_TYPES}
                onChange={setEmploymentType}
                className="mt-1.5 flex w-full"
              />
            </div>
          </div>

          {SECTIONS.map((section) => {
            const sectionRows = rows.filter((r) => r.kind === section.kind);
            return (
              <section key={section.kind} aria-labelledby={`${section.kind}-heading`}>
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <h2 id={`${section.kind}-heading`} className="text-base">
                    {section.title}
                  </h2>
                  {sectionRows.length > 0 && (
                    <span className="font-arial text-xs">Importance: 1 low, 5 high</span>
                  )}
                </div>
                {section.kind === "skill" && (
                  <FieldError id="job-requirements-error" message={errors.requirements} />
                )}
                <ul>
                  {sectionRows.map((row) => (
                    <RequirementRow
                      key={row.key}
                      row={row}
                      placeholder={section.placeholder}
                      autoFocus={newRowInput.current === row.kind && !row.label}
                      onChange={(change) => updateRow(row.key, change)}
                      onRemove={() =>
                        setRows((current) => current.filter((r) => r.key !== row.key))
                      }
                    />
                  ))}
                </ul>
                <button
                  type="button"
                  className="textlink mt-2.5 cursor-pointer font-arial text-sm"
                  onClick={() => addRow(section.kind)}
                >
                  {section.add}
                </button>
              </section>
            );
          })}
        </div>
      </div>
    </form>
  );
}

function RequirementRow({
  row,
  placeholder,
  autoFocus,
  onChange,
  onRemove,
}: {
  row: Row;
  placeholder: string;
  autoFocus: boolean;
  onChange: (change: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const name = row.label || "new requirement";

  return (
    <li className="border-b border-hairline-soft py-2.5">
      <div className="flex items-center gap-2">
        <Input
          aria-label={placeholder.replace("e.g. ", "Requirement, for example ")}
          placeholder={placeholder}
          value={row.label}
          autoFocus={autoFocus}
          onChange={(event) => onChange({ label: event.target.value })}
          className="h-9 min-w-0 flex-1"
        />
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-lg leading-none text-silver transition-colors hover:bg-wash hover:text-platinum"
        >
          ×
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Segmented
          label={`Is ${name} required or preferred?`}
          value={row.isRequired ? "required" : "preferred"}
          options={NEED}
          onChange={(need) => onChange({ isRequired: need === "required" })}
        />
        <Segmented
          label={`Importance of ${name}, 1 low to 5 high`}
          value={row.importance}
          options={IMPORTANCE}
          onChange={(importance) => onChange({ importance })}
        />
        {row.quote && (
          <p className="min-w-0 flex-1 basis-48 border-l-2 border-citrine pl-2.5 font-mono text-xs leading-relaxed">
            {row.quote}
          </p>
        )}
      </div>
      {row.verified === false && (
        <p className="mt-1 font-arial text-sm text-coral">
          Not found word for word in the description. Check this one.
        </p>
      )}
    </li>
  );
}
