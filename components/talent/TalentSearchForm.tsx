"use client";

import { useTransition, type FormEvent } from "react";

import {
  searchAction,
  type TalentResult,
} from "@/app/recruiter/talent-search/actions";
import { Button } from "@/components/ui/button";
import { ProgressNote } from "@/components/ui/progress";
import { useSessionState } from "@/components/viewer";

import { TalentResults } from "./TalentResults";

export function TalentSearchForm() {
  const [query, setQuery] = useSessionState("talent-query", "");
  const [result, setResult] = useSessionState<TalentResult | null>("talent-result", null);
  const [showPartial, setShowPartial] = useSessionState("talent-partial", false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setResult(await searchAction(query));
      setShowPartial(false);
    });
  }

  const partial = (result?.ok && result.partial) || [];

  return (
    <>
      <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="talent-query" className="sr-only">
          What are you looking for?
        </label>
        <input
          id="talent-query"
          value={query}
          maxLength={300}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Python developers with REST API experience"
          className="field-box min-h-11 min-w-0 flex-[1_1_260px] px-3 text-sm"
        />
        <Button type="submit" loading={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>
      {pending && <ProgressNote label="Searching resumes and checking the evidence..." className="mt-4" />}
      <div aria-live="polite">
        {result?.ok === false && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {result.message}
          </p>
        )}
        {result?.ok && result.results.length === 0 && (
          <p className="mt-4 text-sm">
            {partial.length > 0
              ? "No resume shows everything you asked for."
              : "No resumes matched. Try describing the skill or work in different words."}
          </p>
        )}
        {result?.ok && result.results.length > 0 && (
          <TalentResults results={result.results} />
        )}
        {partial.length > 0 && !showPartial && (
          <button
            type="button"
            onClick={() => setShowPartial(true)}
            className="textlink mt-4 font-arial text-sm"
          >
            Show {partial.length} partial {partial.length === 1 ? "match" : "matches"}
          </button>
        )}
        {showPartial && (
          <>
            <h2 className="mt-6 text-[15px]">Partial matches</h2>
            <TalentResults results={partial} />
          </>
        )}
      </div>
    </>
  );
}
