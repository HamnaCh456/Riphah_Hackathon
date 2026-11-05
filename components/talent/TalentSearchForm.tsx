"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  searchAction,
  type TalentResult,
} from "@/app/recruiter/talent-search/actions";
import { Button } from "@/components/ui/button";

import { TalentResults } from "./TalentResults";

export function TalentSearchForm() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TalentResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => setResult(await searchAction(query)));
  }

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
          className="min-h-11 min-w-0 flex-[1_1_260px] rounded-small border bg-deep px-3 text-sm text-mist"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>
      <div aria-live="polite">
        {result?.ok === false && (
          <p role="alert" className="mt-4 text-sm text-coral">
            {result.message}
          </p>
        )}
        {result?.ok && result.results.length === 0 && (
          <p className="mt-4 text-sm">
            No resumes matched. Try describing the skill or work in different
            words.
          </p>
        )}
        {result?.ok && result.results.length > 0 && (
          <TalentResults results={result.results} />
        )}
      </div>
    </>
  );
}
