export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export type DecisionInput =
  | { action: "dismiss" }
  | { action: "merge"; keep: string; other: string };

/** A merge needs a chosen record and a recruiter's explicit confirmation. */
export function parseDecision(
  fields: { action: unknown; keep: unknown; confirmed: unknown },
  pair: [string, string],
): { ok: true; decision: DecisionInput } | { ok: false; error: string } {
  if (fields.action === "dismiss") return { ok: true, decision: { action: "dismiss" } };
  if (fields.action !== "merge") return { ok: false, error: "Choose what to do with these records." };
  if (typeof fields.keep !== "string" || !pair.includes(fields.keep)) {
    return { ok: false, error: "Choose which record to keep before merging." };
  }
  if (fields.confirmed !== "on") {
    return { ok: false, error: "Tick the box to confirm these are the same person." };
  }
  const other = pair[0] === fields.keep ? pair[1] : pair[0];
  return { ok: true, decision: { action: "merge", keep: fields.keep, other } };
}
