import { expect, it } from "vitest";

import { PARSE_RESPONSE_SCHEMA } from "@/lib/resume/parse";

import { toOpenAiSchema } from "./openai-schema";

it("lowercases types and closes objects", () => {
  expect(
    toOpenAiSchema({
      type: "OBJECT",
      properties: { name: { type: "STRING" } },
      required: ["name"],
    }),
  ).toEqual({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
    additionalProperties: false,
  });
});

it("makes a field Gemini could omit required but nullable", () => {
  const schema = toOpenAiSchema({
    type: "OBJECT",
    properties: { title: { type: "STRING" }, key: { type: "STRING" } },
    required: ["key"],
  });
  expect(schema.required).toEqual(["title", "key"]);
  expect((schema.properties as Record<string, unknown>).title).toEqual({ type: ["string", "null"] });
});

it("allows null in a nullable enum", () => {
  expect(toOpenAiSchema({ type: "STRING", nullable: true, enum: ["a", "b"] })).toEqual({
    type: ["string", "null"],
    enum: ["a", "b", null],
  });
});

it("converts array items", () => {
  expect(toOpenAiSchema({ type: "ARRAY", items: { type: "BOOLEAN" } })).toEqual({
    type: "array",
    items: { type: "boolean" },
  });
});

it("converts a real schema with spread fields", () => {
  const schema = toOpenAiSchema(PARSE_RESPONSE_SCHEMA);
  expect(schema.type).toBe("object");
  expect(schema.additionalProperties).toBe(false);
});
