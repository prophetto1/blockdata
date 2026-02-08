export type SchemaFieldMeta = {
  key: string;
  type: string; // "string" | "number" | "boolean" | "array" | "object" | "enum"
  enumValues?: string[];
  description?: string;
};

export function extractSchemaFields(schemaJsonb: Record<string, unknown>): SchemaFieldMeta[] {
  // JSON Schema convention: "properties" key (matches prose-optimizer-v1)
  const props =
    (schemaJsonb['properties'] as Record<string, Record<string, unknown>> | undefined) ??
    (schemaJsonb['fields'] as Record<string, Record<string, unknown>> | undefined);

  if (!props || typeof props !== 'object') return [];

  const fields: SchemaFieldMeta[] = [];
  for (const [key, def] of Object.entries(props)) {
    if (!def || typeof def !== 'object') continue;

    let type = typeof def['type'] === 'string' ? def['type'] : 'string';
    let enumValues: string[] | undefined;

    if (Array.isArray(def['enum'])) {
      type = 'enum';
      enumValues = (def['enum'] as unknown[]).map(String);
    } else if (type === 'array' && def['items']) {
      type = 'array';
    } else if (type === 'object') {
      type = 'object';
    }

    fields.push({
      key,
      type,
      enumValues,
      description: typeof def['description'] === 'string' ? def['description'] : undefined,
    });
  }

  return fields;
}
