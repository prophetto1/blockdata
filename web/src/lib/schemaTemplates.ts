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
    template_id: 'contract-review',
    template_version: '1.0.0',
    name: 'Contract Review',
    category: 'legal',
    description: 'Extract clause type, risk level, obligations, and governing law signals.',
    use_case_tags: ['legal', 'contracts', 'risk'],
    schema_json_seed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        clause_type: { type: 'string', description: 'Primary clause category.' },
        risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
        obligations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Party obligations found in this block.',
        },
        governing_law: { type: 'string' },
      },
      required: ['clause_type', 'risk_level'],
    },
    preview: {
      fields: [
        { key: 'clause_type', type: 'string' },
        { key: 'risk_level', type: 'enum', description: 'low | medium | high' },
        { key: 'obligations', type: 'array' },
        { key: 'governing_law', type: 'string' },
      ],
      use_case: 'Contract redlining and review workflows.',
    },
  },
  {
    template_id: 'prose-quality',
    template_version: '1.0.0',
    name: 'Prose Quality',
    category: 'writing',
    description: 'Track quality issues, revisions, and confidence for each paragraph.',
    use_case_tags: ['writing', 'editing', 'revision'],
    schema_json_seed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        revised_content: { type: 'string' },
        issues_found: { type: 'array', items: { type: 'string' } },
        quality_score: { type: 'number', minimum: 0, maximum: 1 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['revised_content'],
    },
    preview: {
      fields: [
        { key: 'revised_content', type: 'string' },
        { key: 'issues_found', type: 'array' },
        { key: 'quality_score', type: 'number' },
        { key: 'confidence', type: 'number' },
      ],
      use_case: 'Long-form manuscript and report improvement.',
    },
  },
  {
    template_id: 'citation-analysis',
    template_version: '1.0.0',
    name: 'Citation Analysis',
    category: 'research',
    description: 'Identify citations, citation role, and claim support quality.',
    use_case_tags: ['research', 'citations', 'analysis'],
    schema_json_seed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cited_authority: { type: 'array', items: { type: 'string' } },
        citation_role: {
          type: 'string',
          enum: ['supporting', 'distinguishing', 'background', 'counterpoint'],
        },
        claim_strength: { type: 'number', minimum: 0, maximum: 1 },
        notes: { type: 'string' },
      },
      required: ['citation_role'],
    },
    preview: {
      fields: [
        { key: 'cited_authority', type: 'array' },
        { key: 'citation_role', type: 'enum' },
        { key: 'claim_strength', type: 'number' },
        { key: 'notes', type: 'string' },
      ],
      use_case: 'Citation mapping and source-quality evaluation.',
    },
  },
];

export function getSchemaTemplateSeed(templateId: string): SchemaTemplateSeed | null {
  return SCHEMA_TEMPLATE_SEEDS.find((template) => template.template_id === templateId) ?? null;
}

