export type SchemaTemplateSeed = {
  template_id: string;
  template_version: string;
  name: string;
  category: string;
  description: string;
  use_case_tags: string[];
  schema_json_seed: Record<string, unknown>;
  preview: {
    fields: Array<{ key: string; type: string; description?: string }>;
    use_case: string;
  };
};

export const SCHEMA_TEMPLATE_SEEDS: SchemaTemplateSeed[] = [
  {
    template_id: 'quick-note',
    template_version: '1.0.0',
    name: 'Quick Note',
    category: 'starter',
    description: 'Minimal two-field schema for fast smoke runs.',
    use_case_tags: ['starter', 'smoke'],
    schema_json_seed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: { type: 'string', description: 'Short classification or note label.' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['label'],
    },
    preview: {
      fields: [
        { key: 'label', type: 'string' },
        { key: 'confidence', type: 'number' },
      ],
      use_case: 'Quick validation run to confirm schema->run->grid behavior.',
    },
  },
  {
    template_id: 'quick-note-plus',
    template_version: '1.0.0',
    name: 'Quick Note Plus',
    category: 'starter',
    description: 'Small starter schema with one additional note field for richer smoke tests.',
    use_case_tags: ['starter', 'smoke', 'notes'],
    schema_json_seed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: { type: 'string', description: 'Short classification label.' },
        note: { type: 'string', description: 'One-line supporting note.' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['label', 'note'],
    },
    preview: {
      fields: [
        { key: 'label', type: 'string' },
        { key: 'note', type: 'string' },
        { key: 'confidence', type: 'number' },
      ],
      use_case: 'Fast run validation where each result needs both a label and a short rationale.',
    },
  },
];

export function getSchemaTemplateSeed(templateId: string): SchemaTemplateSeed | null {
  return SCHEMA_TEMPLATE_SEEDS.find((template) => template.template_id === templateId) ?? null;
}
