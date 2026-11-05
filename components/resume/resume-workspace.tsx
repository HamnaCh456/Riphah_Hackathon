"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import {
  retryResumeParse,
  saveResumeCorrections,
} from "@/app/candidate/resume/actions";
import { ItemAccordion, ResumeAccordion } from "@/components/resume/accordion";
import { ResumeSection } from "@/components/resume/resume-section";
import { ResumeUpload } from "@/components/resume/resume-upload";
import { useAutosave, type SaveStatus } from "@/components/resume/use-autosave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { RESUME_FAILURE_MESSAGES } from "@/lib/resume/file-check";
import type { ContactField, ResumeData } from "@/lib/resume/schema";
import type { ResumeSkill, ResumeView } from "@/lib/resume/service";
import { displaySkill, normalizeSkill } from "@/lib/skills/normalize";

const CONTACT: { field: ContactField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "location", label: "Location" },
  { field: "links", label: "Links" },
];

const SKILL_UNDO_MS = 5000;

const CONTENT_KEYS = {
  experience: ["title", "company", "dates", "summary"],
  projects: ["name", "technologies", "description"],
  education: ["institution", "degree", "dates"],
} as const;

/** An entry just added and not filled in yet stays on the page, not in the database. */
function withoutBlankEntries(data: ResumeData): ResumeData {
  const keep = <T extends { source: string }>(items: T[], keys: readonly string[]) =>
    items.filter(
      (item) =>
        item.source !== "candidate" ||
        keys.some((key) => String(item[key as keyof T] ?? "").trim()),
    );
  return {
    ...data,
    experience: keep(data.experience, CONTENT_KEYS.experience),
    projects: keep(data.projects, CONTENT_KEYS.projects),
    education: keep(data.education, CONTENT_KEYS.education),
  };
}

type Provenance = {
  id: string;
  excerpt: string | null;
  verified: boolean;
  source: "resume" | "candidate";
  edited: boolean;
};

function adoptProvenance<T extends Provenance>(items: T[], saved: T[]): T[] {
  const byId = new Map(saved.map((item) => [item.id, item]));
  return items.map((item) => {
    const match = byId.get(item.id);
    return match
      ? { ...item, excerpt: match.excerpt, verified: match.verified, source: match.source, edited: match.edited }
      : item;
  });
}

/** Takes the server's verdict on each entry and leaves what the candidate typed alone. */
function withSavedProvenance(mine: ResumeData, saved: ResumeData): ResumeData {
  return {
    ...mine,
    unverifiedContact: saved.unverifiedContact,
    experience: adoptProvenance(mine.experience, saved.experience),
    projects: adoptProvenance(mine.projects, saved.projects),
    education: adoptProvenance(mine.education, saved.education),
  };
}

function RetryNotice({
  retryable,
}: {
  retryable: { id: string; fileName: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-y py-3">
      <p className="min-w-0 flex-1 basis-64 font-arial text-sm text-danger">
        {retryable.fileName}: {RESUME_FAILURE_MESSAGES.ai_failed}
      </p>
      <Button
        variant="ghost"
        size="sm"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await retryResumeParse(retryable.id);
            if (result.ok) toast("Resume read. Check the details below.");
            else toast(result.error, { tone: "error" });
            router.refresh();
          })
        }
      >
        {isPending ? "Reading..." : "Try again"}
      </Button>
    </div>
  );
}

export function ResumeWorkspace({
  resume,
  retryable,
}: {
  resume: ResumeView | null;
  retryable: { id: string; fileName: string } | null;
}) {
  const notice = retryable && <RetryNotice retryable={retryable} />;

  if (resume) return <ResumeEditor resume={resume} notice={notice} />;

  return (
    <>
      <h1 className="text-2xl">My resume</h1>
      {notice}
      <div className="mt-5">
        <ResumeUpload compact={false} />
      </div>
    </>
  );
}

function SaveState({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "failed") {
    return (
      <p role="alert" className="font-arial text-sm text-danger">
        Not saved.{" "}
        <button type="button" className="textlink cursor-pointer" onClick={onRetry}>
          Try again
        </button>
      </p>
    );
  }
  return (
    <p aria-live="polite" className="font-arial text-sm text-muted">
      {status === "saving"
        ? "Saving..."
        : status === "saved"
          ? "All changes saved"
          : "Changes save automatically"}
    </p>
  );
}

function ResumeEditor({ resume, notice }: { resume: ResumeView; notice: ReactNode }) {
  const toast = useToast();
  const [data, setData] = useState<ResumeData>(resume.data);
  const [skills, setSkills] = useState<ResumeSkill[]>(resume.skills);
  const [addedSkills, setAddedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [openSkills, setOpenSkills] = useState<ReadonlySet<string>>(new Set());

  /** Bumped on every change, so a slow save can tell the candidate has typed since. */
  const version = useRef(0);
  /** A removed skill stays in the database until Undo runs out: its evidence can't be rebuilt. */
  const removing = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const { status, markChanged, flush } = useAutosave(async () => {
    const sent = version.current;
    const result = await saveResumeCorrections({
      resumeId: resume.id,
      data: withoutBlankEntries(data),
      keptSkillIds: [...skills.map((skill) => skill.id), ...removing.current.keys()],
      addedSkills,
    });
    if (!result.ok) {
      toast(result.error, { tone: "error" });
      return false;
    }
    if (version.current === sent) {
      setData((current) => withSavedProvenance(current, result.data));
      setSkills((current) => [...current, ...result.added]);
      setAddedSkills([]);
    }
    return true;
  });

  function changed() {
    version.current += 1;
    markChanged();
  }

  // Leaving the page finishes what's waiting, including removals still inside their Undo time.
  useEffect(() => {
    const pending = removing.current;
    return () => {
      if (pending.size > 0) {
        pending.forEach((timer) => clearTimeout(timer));
        pending.clear();
        markChanged();
      }
      void flush();
    };
  }, [flush, markChanged]);

  const update = (change: Partial<ResumeData>) => {
    setData((current) => ({ ...current, ...change }));
    changed();
  };

  function updateSection<K extends "experience" | "projects" | "education">(
    key: K,
    change: (items: ResumeData[K]) => ResumeData[K],
  ) {
    setData((current) => ({ ...current, [key]: change(current[key]) }));
    changed();
  }

  function addSkill() {
    const term = newSkill.trim();
    if (!term) return;
    const key = normalizeSkill(term);
    const exists =
      skills.some((skill) => normalizeSkill(skill.name) === key) ||
      addedSkills.some((skill) => normalizeSkill(skill) === key);
    if (exists) {
      toast(`${displaySkill(term)} is already listed.`);
    } else {
      setAddedSkills((current) => [...current, displaySkill(term)]);
      changed();
    }
    setNewSkill("");
  }

  function removeSkill(skill: ResumeSkill, index: number) {
    setSkills((current) => current.filter((s) => s.id !== skill.id));
    removing.current.set(
      skill.id,
      setTimeout(() => {
        removing.current.delete(skill.id);
        changed();
      }, SKILL_UNDO_MS),
    );
    toast(`Removed ${skill.name}`, {
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(removing.current.get(skill.id));
          removing.current.delete(skill.id);
          setSkills((current) => [...current.slice(0, index), skill, ...current.slice(index)]);
        },
      },
    });
  }

  function toggleSkill(id: string) {
    setOpenSkills((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const allSkillNames = [...skills.map((skill) => skill.name), ...addedSkills];

  return (
    // Moving out of a field saves straight away rather than waiting for the timer.
    <div onBlur={() => void flush()}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl">My resume</h1>
          <p className="min-w-0 truncate font-arial text-sm">{resume.fileName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SaveState status={status} onRetry={() => void flush()} />
          <ResumeUpload compact />
        </div>
      </div>

      {notice}

      <div className="mt-4 divide-y divide-hairline rounded-small border bg-surface">
        <ResumeAccordion
          title="Contact"
          summary={
            CONTACT.map(({ field }) => data[field]).filter(Boolean).join(" · ") ||
            "None found in your resume."
          }
          flagged={data.unverifiedContact.length}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTACT.map(({ field, label }) => {
              const flagged = data.unverifiedContact.includes(field);
              return (
                <div key={field}>
                  <Label htmlFor={`contact-${field}`}>{label}</Label>
                  <Input
                    id={`contact-${field}`}
                    value={data[field]}
                    aria-describedby={flagged ? `contact-${field}-flag` : undefined}
                    onChange={(event) =>
                      update({
                        [field]: event.target.value,
                        unverifiedContact: data.unverifiedContact.filter((f) => f !== field),
                      })
                    }
                    className="mt-1.5 h-10"
                  />
                  {flagged && (
                    <p id={`contact-${field}-flag`} className="mt-1 font-arial text-sm text-danger">
                      Not found in your resume. Check this.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ResumeAccordion>

        <ResumeAccordion
          title="Skills"
          count={allSkillNames.length}
          summary={allSkillNames.join(", ") || "None found in your resume."}
          flagged={skills.filter((skill) => skill.source === "ai" && !skill.verified).length}
        >
          <ul className="grid items-start gap-x-8 md:grid-cols-2 xl:grid-cols-3">
            {skills.map((skill, index) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                open={openSkills.has(skill.id)}
                onToggle={() => toggleSkill(skill.id)}
                onRemove={() => removeSkill(skill, index)}
              />
            ))}
            {addedSkills.map((name) => (
              <SkillRow
                key={name}
                skill={{ id: name, name, rawTerm: null, excerpt: null, verified: false, source: "candidate" }}
                open={false}
                onToggle={() => {}}
                onRemove={() => {
                  setAddedSkills((current) => current.filter((s) => s !== name));
                  changed();
                }}
              />
            ))}
          </ul>
          <div className="mt-3 flex max-w-md gap-2">
            <Input
              aria-label="Add a skill"
              placeholder="Add a skill"
              value={newSkill}
              onChange={(event) => setNewSkill(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSkill();
                }
              }}
              className="h-10"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addSkill}>Add</Button>
          </div>
        </ResumeAccordion>

        <ResumeSection
          title="Experience"
          addLabel="Add experience"
          items={data.experience}
          fields={[
            { key: "title", label: "Job title" },
            { key: "company", label: "Company" },
            { key: "dates", label: "Dates" },
            { key: "summary", label: "What you did", long: true },
          ]}
          blank={{ title: "", company: "", dates: "", summary: "" }}
          metaOf={(item) => [item.company, item.dates].filter(Boolean).join(" · ")}
          onChange={(change) => updateSection("experience", change)}
        />
        <ResumeSection
          title="Projects"
          addLabel="Add project"
          items={data.projects}
          fields={[
            { key: "name", label: "Project name", wide: true },
            { key: "technologies", label: "Technologies", wide: true },
            { key: "description", label: "Description", long: true },
          ]}
          blank={{ name: "", technologies: "", description: "" }}
          metaOf={(item) => item.technologies}
          onChange={(change) => updateSection("projects", change)}
        />
        <ResumeSection
          title="Education"
          addLabel="Add education"
          items={data.education}
          fields={[
            { key: "institution", label: "School", wide: true },
            { key: "degree", label: "Degree" },
            { key: "dates", label: "Dates" },
          ]}
          blank={{ institution: "", degree: "", dates: "" }}
          metaOf={(item) => [item.degree, item.dates].filter(Boolean).join(" · ")}
          onChange={(change) => updateSection("education", change)}
        />
      </div>
    </div>
  );
}

function SkillRow({
  skill,
  open,
  onToggle,
  onRemove,
}: {
  skill: ResumeSkill;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const showRaw =
    skill.rawTerm && skill.rawTerm.toLowerCase() !== skill.name.toLowerCase();
  const flagged = skill.source === "ai" && !skill.verified;
  const hasDetail = Boolean(skill.excerpt || showRaw || flagged);

  return (
    <ItemAccordion
      open={open}
      onToggle={onToggle}
      title={skill.name}
      meta={skill.source === "candidate" ? "added by you" : undefined}
      flag={flagged ? "Check this" : undefined}
      end={
        <button
          type="button"
          aria-label={`Remove ${skill.name}`}
          onClick={onRemove}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-lg leading-none text-muted transition-colors hover:bg-wash hover:text-navy"
        >
          ×
        </button>
      }
    >
      {hasDetail && (
        <>
          {showRaw && <p className="font-arial text-sm">Written as {skill.rawTerm}</p>}
          {skill.excerpt && (
            <p className="mt-1 border-l-2 border-gold pl-2.5 font-mono text-xs leading-relaxed">
              {skill.excerpt}
            </p>
          )}
          {flagged && (
            <p className="mt-1 font-arial text-sm text-danger">
              Not found in your resume. Check or remove this.
            </p>
          )}
        </>
      )}
    </ItemAccordion>
  );
}
