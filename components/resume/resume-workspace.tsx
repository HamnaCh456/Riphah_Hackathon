"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  retryResumeParse,
  saveResumeCorrections,
} from "@/app/candidate/resume/actions";
import { ResumeSection } from "@/components/resume/resume-section";
import { ResumeUpload } from "@/components/resume/resume-upload";
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
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl">My resume</h1>
          {resume && (
            <p className="min-w-0 truncate font-arial text-sm">{resume.fileName}</p>
          )}
        </div>
        {resume && <ResumeUpload compact />}
      </div>

      {retryable && <RetryNotice retryable={retryable} />}

      {resume ? (
        <ResumeEditor resume={resume} />
      ) : (
        !retryable && (
          <div className="mt-5">
            <ResumeUpload compact={false} />
          </div>
        )
      )}
      {!resume && retryable && (
        <div className="mt-5">
          <ResumeUpload compact={false} />
        </div>
      )}
    </>
  );
}

function ResumeEditor({ resume }: { resume: ResumeView }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<ResumeData>(resume.data);
  const [skills, setSkills] = useState<ResumeSkill[]>(resume.skills);
  const [addedSkills, setAddedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const update = (change: Partial<ResumeData>) => {
    setData((current) => ({ ...current, ...change }));
    setIsDirty(true);
  };

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
      setIsDirty(true);
    }
    setNewSkill("");
  }

  function save() {
    startSaving(async () => {
      const result = await saveResumeCorrections({
        resumeId: resume.id,
        data,
        keptSkillIds: skills.map((skill) => skill.id),
        addedSkills,
      });
      if (!result.ok) {
        toast(result.error, { tone: "error" });
        return;
      }
      toast("Corrections saved");
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <div className="grid gap-x-10 gap-y-7 lg:grid-cols-2">
        <div className="min-w-0 space-y-7">
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="border-b pb-2 text-base">Contact</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          </section>

          <section aria-labelledby="skills-heading">
            <h2 id="skills-heading" className="border-b pb-2 text-base">
              Skills <span className="font-arial text-sm tabular-nums text-muted">{skills.length + addedSkills.length}</span>
            </h2>
            {skills.length + addedSkills.length === 0 && (
              <p className="mt-2 text-sm">No skills found. Add yours below.</p>
            )}
            <ul>
              {skills.map((skill) => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  onRemove={() => {
                    setSkills((current) => current.filter((s) => s.id !== skill.id));
                    setIsDirty(true);
                  }}
                />
              ))}
              {addedSkills.map((name) => (
                <SkillRow
                  key={name}
                  skill={{ id: name, name, rawTerm: null, excerpt: null, verified: false, source: "candidate" }}
                  onRemove={() => setAddedSkills((current) => current.filter((s) => s !== name))}
                />
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
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
          </section>
        </div>

        <div className="min-w-0 space-y-7">
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
            onChange={(experience) => update({ experience })}
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
            onChange={(projects) => update({ projects })}
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
            onChange={(education) => update({ education })}
          />
        </div>
      </div>

      {isDirty && (
        <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex items-center justify-end gap-3 border-t bg-surface px-5 py-3 lg:-mx-10 lg:px-10">
          <Button loading={isSaving} size="sm" onClick={save}>
            {isSaving ? "Saving..." : "Save corrections"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SkillRow({
  skill,
  onRemove,
}: {
  skill: ResumeSkill;
  onRemove: () => void;
}) {
  const showRaw =
    skill.rawTerm && skill.rawTerm.toLowerCase() !== skill.name.toLowerCase();

  return (
    <li className="border-b border-hairline-soft py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-navy">
          {skill.name}
          {showRaw && <span className="text-muted"> · written as {skill.rawTerm}</span>}
          {skill.source === "candidate" && <span className="text-muted"> · added by you</span>}
        </p>
        <button
          type="button"
          aria-label={`Remove ${skill.name}`}
          onClick={onRemove}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-lg leading-none text-muted transition-colors hover:bg-wash hover:text-navy"
        >
          ×
        </button>
      </div>
      {skill.excerpt && (
        <p className="mt-1 border-l-2 border-gold pl-2.5 font-mono text-xs leading-relaxed">
          {skill.excerpt}
        </p>
      )}
      {skill.source === "ai" && !skill.verified && (
        <p className="mt-1 font-arial text-sm text-danger">
          Not found in your resume. Check or remove this.
        </p>
      )}
    </li>
  );
}
