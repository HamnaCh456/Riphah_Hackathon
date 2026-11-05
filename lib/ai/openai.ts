import "server-only";

import { serverEnv } from "@/lib/env";

import { toOpenAiSchema } from "./openai-schema";

// The cheapest model that passed our test, at about $0.0003 per assessment. gpt-5-nano has a lower
// list price, but it missed stated absences like "no hands-on Docker experience" and cost more per
// call once it reasoned enough to catch some of them.
export const OPENAI_MODEL = "gpt-4o-mini";
// Limits what one call can cost, at about $0.005 of output.
const MAX_OUTPUT_TOKENS = 8_000;

/** Calls OpenAI in strict JSON mode and returns the parsed answer. Throws if there is no valid JSON. */
export async function generateOpenAiJson(
  args: { system: string; prompt: string; responseSchema: object },
  timeoutMs: number,
): Promise<unknown> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "answer",
          strict: true,
          schema: toOpenAiSchema(args.responseSchema),
        },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`OpenAI returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const body = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return JSON.parse(body.choices?.[0]?.message?.content ?? "");
}
