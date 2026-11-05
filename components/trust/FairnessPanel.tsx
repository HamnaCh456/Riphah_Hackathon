"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  runFairnessAction,
  type FairnessActionResult,
} from "@/lib/trust/fairness-action";

const VERDICT_TEXT = {
  passed: "Changing personal details did not meaningfully change the score.",
  failed: "A personal detail changed the score. Review this applicant by hand.",
  inconclusive:
    "Inconclusive. The AI's scores varied too much between identical runs to tell, so review this applicant by hand.",
};

export function FairnessPanel({ applicationId }: { applicationId: string }) {
  const [result, setResult] = useState<FairnessActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section aria-label="Fairness check" className="mt-8 border-t pt-4">
      <h2 className="text-platinum">Fairness check</h2>
      <p className="mt-1 text-sm">
        Scores this resume again with personal details changed. The saved score
        stays the same.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3"
        disabled={pending}
        onClick={() =>
          startTransition(async () =>
            setResult(await runFairnessAction(applicationId)),
          )
        }
      >
        {pending ? "Running fairness check…" : "Run fairness check"}
      </Button>
      <div aria-live="polite">
        {result?.ok === false && (
          <p role="alert" className="mt-3 text-sm text-coral">
            {result.message}
          </p>
        )}
        {result?.ok && (
          <>
            <p
              className={`mt-3 text-sm ${result.report.verdict === "failed" ? "text-coral" : "text-mist"}`}
            >
              {VERDICT_TEXT[result.report.verdict]}
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-normal">
                      Detail changed
                    </th>
                    <th scope="col" className="py-2 pr-4 font-normal">
                      Reached the AI?
                    </th>
                    <th scope="col" className="py-2 font-normal">
                      Score change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.report.results.map((r) => (
                    <tr key={r.attribute} className="border-t">
                      <th scope="row" className="py-2 pr-4 font-normal text-mist">
                        {r.attribute}
                      </th>
                      <td className="py-2 pr-4">
                        {r.inputChanged ? "Yes" : "No, removed first"}
                      </td>
                      <td className="py-2">
                        {r.scoreChange > 0 ? `+${r.scoreChange}` : r.scoreChange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm">
              Scoring the same text twice differed by {result.report.noise}{" "}
              point{result.report.noise === 1 ? "" : "s"}.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
