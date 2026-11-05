type GeminiSchema = {
  type?: string;
  nullable?: boolean;
  enum?: readonly (string | null)[];
  items?: GeminiSchema;
  properties?: Record<string, GeminiSchema>;
  required?: readonly string[];
};

/**
 * Turns a Gemini response schema into the strict form OpenAI requires: lowercase types, no extra
 * fields, and every field listed as required. A field Gemini could leave out may be null instead.
 */
export function toOpenAiSchema(schema: GeminiSchema, optional = false): Record<string, unknown> {
  const type = (schema.type ?? "string").toLowerCase();
  const nullable = Boolean(schema.nullable) || optional;
  const out: Record<string, unknown> = { type: nullable ? [type, "null"] : type };

  if (schema.enum) out.enum = nullable ? [...schema.enum, null] : [...schema.enum];
  if (schema.items) out.items = toOpenAiSchema(schema.items);
  if (schema.properties) {
    const required = schema.required ?? [];
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([name, field]) => [
        name,
        toOpenAiSchema(field, !required.includes(name)),
      ]),
    );
    out.required = Object.keys(schema.properties);
    out.additionalProperties = false;
  }
  return out;
}
