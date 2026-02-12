type UploadMode = 'wizard' | 'advanced';
type SupportedFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
type SupportedArrayItemType = 'string' | 'number' | 'integer' | 'boolean' | 'object';

const STORAGE_PREFIX = 'schema-upload-draft:';

const TOP_LEVEL_ALLOWED_KEYS = new Set([
  'type',
  'properties',
  'required',
  'additionalProperties',
  'description',
  'prompt_config',
]);

const PROMPT_ALLOWED_KEYS = new Set([
  'system_instructions',
  'per_block_prompt',
  'model',
  'temperature',
  'max_tokens_per_block',
]);

const FIELD_ALLOWED_KEYS = new Set([
  'type',
  'description',
  'enum',
  'minimum',
  'maximum',
  'pattern',
  'format',
  'items',
  'minItems',
  'maxItems',
  'properties',
  'additionalProperties',
]);

const UNSUPPORTED_COMPLEX_KEYS = new Set([
  'allOf',
  'anyOf',
  'oneOf',
  '$ref',
  '$defs',
  'definitions',
  'if',
  'then',
  'else',
  'dependentSchemas',
  'patternProperties',
  'unevaluatedProperties',
  'not',
]);

export type SchemaUploadClassificationReason =
  | 'wizard_subset_compatible'
  | 'invalid_json_root'
  | 'unsupported_top_level_shape'
  | 'unsupported_top_level_construct'
  | 'unsupported_top_level_keys'
  | 'unsupported_prompt_config'
  | 'unsupported_field_shape'
  | 'unsupported_field_construct'
  | 'unsupported_field_keys'
  | 'unsupported_field_type'
  | 'unsupported_field_nullable'
  | 'unsupported_nested_object'
  | 'unsupported_array_items';

export type SchemaUploadClassification = {
  mode: UploadMode;
  reason: SchemaUploadClassificationReason;
  warnings: string[];
};

export type SchemaUploadDraft = {
  uploadName: string;
  suggestedSchemaRef: string;
  schemaJson: Record<string, unknown>;
  classification: SchemaUploadClassification;
  createdAt: string;
};

export type ParseUploadResult =
  | { ok: true; draft: SchemaUploadDraft }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 64);
  return cleaned || 'schema';
}

function deriveBaseRef(schemaJson: Record<string, unknown>, uploadName: string): string {
  if (typeof schemaJson.$id === 'string' && schemaJson.$id.trim()) {
    const parts = schemaJson.$id.trim().split(/[/:#]/).filter(Boolean);
    if (parts.length > 0) {
      const tail = parts[parts.length - 1];
      if (tail) return tail;
    }
  }

  if (typeof schemaJson.title === 'string' && schemaJson.title.trim()) {
    return schemaJson.title.trim();
  }

  const fromFile = uploadName.trim().replace(/\.json$/i, '');
  return fromFile || 'schema';
}

function parseFieldType(typeValue: unknown): { baseType: SupportedFieldType | null; nullable: boolean } {
  if (typeof typeValue === 'string') {
    if (
      typeValue === 'string' ||
      typeValue === 'number' ||
      typeValue === 'integer' ||
      typeValue === 'boolean' ||
      typeValue === 'array' ||
      typeValue === 'object'
    ) {
      return { baseType: typeValue, nullable: false };
    }
    return { baseType: null, nullable: false };
  }

  if (Array.isArray(typeValue)) {
    const nonNull = typeValue.filter((item): item is string => typeof item === 'string' && item !== 'null');
    const nullable = typeValue.some((item) => item === 'null');
    if (nonNull.length !== 1) return { baseType: null, nullable };
    const [candidate] = nonNull;
    if (
      candidate === 'string' ||
      candidate === 'number' ||
      candidate === 'integer' ||
      candidate === 'boolean' ||
      candidate === 'array' ||
      candidate === 'object'
    ) {
      return { baseType: candidate, nullable };
    }
  }

  return { baseType: null, nullable: false };
}

function advanced(reason: SchemaUploadClassificationReason, warnings: string[]): SchemaUploadClassification {
  return { mode: 'advanced', reason, warnings };
}

function validateTopLevel(schemaJson: Record<string, unknown>): SchemaUploadClassification | null {
  if (schemaJson.type !== 'object') {
    return advanced('unsupported_top_level_shape', [
      'Root schema must be `type: "object"` for wizard mode.',
    ]);
  }

  const complexKeys = Object.keys(schemaJson).filter((key) => UNSUPPORTED_COMPLEX_KEYS.has(key));
  if (complexKeys.length > 0) {
    return advanced('unsupported_top_level_construct', [
      `Unsupported top-level JSON Schema constructs: ${complexKeys.join(', ')}.`,
    ]);
  }

  const extraTopLevel = Object.keys(schemaJson).filter((key) => !TOP_LEVEL_ALLOWED_KEYS.has(key));
  if (extraTopLevel.length > 0) {
    return advanced('unsupported_top_level_keys', [
      `Wizard mode does not preserve top-level keys: ${extraTopLevel.join(', ')}.`,
    ]);
  }

  const properties = schemaJson.properties;
  if (!isPlainObject(properties) || Object.keys(properties).length === 0) {
    return advanced('unsupported_top_level_shape', [
      'Wizard mode requires a non-empty top-level `properties` object.',
    ]);
  }

  if (schemaJson.required !== undefined) {
    const required = schemaJson.required;
    const ok = Array.isArray(required) && required.every((item) => typeof item === 'string');
    if (!ok) {
      return advanced('unsupported_top_level_shape', ['Top-level `required` must be an array of strings.']);
    }
  }

  if (schemaJson.additionalProperties !== undefined && schemaJson.additionalProperties !== false) {
    return advanced('unsupported_top_level_shape', [
      'Wizard mode currently requires top-level `additionalProperties: false`.',
    ]);
  }

  return null;
}

function validatePromptConfig(schemaJson: Record<string, unknown>): SchemaUploadClassification | null {
  const prompt = schemaJson.prompt_config;
  if (prompt === undefined) return null;
  if (!isPlainObject(prompt)) {
    return advanced('unsupported_prompt_config', ['`prompt_config` must be a JSON object.']);
  }

  const extraKeys = Object.keys(prompt).filter((key) => !PROMPT_ALLOWED_KEYS.has(key));
  if (extraKeys.length > 0) {
    return advanced('unsupported_prompt_config', [
      `Wizard mode does not preserve prompt_config keys: ${extraKeys.join(', ')}.`,
    ]);
  }

  if (prompt.system_instructions !== undefined && typeof prompt.system_instructions !== 'string') {
    return advanced('unsupported_prompt_config', ['`prompt_config.system_instructions` must be a string.']);
  }
  if (prompt.per_block_prompt !== undefined && typeof prompt.per_block_prompt !== 'string') {
    return advanced('unsupported_prompt_config', ['`prompt_config.per_block_prompt` must be a string.']);
  }
  if (prompt.model !== undefined && typeof prompt.model !== 'string') {
    return advanced('unsupported_prompt_config', ['`prompt_config.model` must be a string.']);
  }
  if (prompt.temperature !== undefined && typeof prompt.temperature !== 'number') {
    return advanced('unsupported_prompt_config', ['`prompt_config.temperature` must be a number.']);
  }
  if (prompt.max_tokens_per_block !== undefined && typeof prompt.max_tokens_per_block !== 'number') {
    return advanced('unsupported_prompt_config', ['`prompt_config.max_tokens_per_block` must be a number.']);
  }

  return null;
}

function validateArrayItems(fieldKey: string, definition: Record<string, unknown>): SchemaUploadClassification | null {
  if (!isPlainObject(definition.items)) {
    return advanced('unsupported_array_items', [
      `Field "${fieldKey}" must define \`items\` as a simple object in wizard mode.`,
    ]);
  }

  const itemKeys = Object.keys(definition.items);
  if (itemKeys.some((key) => key !== 'type')) {
    return advanced('unsupported_array_items', [
      `Field "${fieldKey}" has unsupported array item keys: ${itemKeys.join(', ')}.`,
    ]);
  }

  const itemType = definition.items.type;
  if (
    itemType !== 'string' &&
    itemType !== 'number' &&
    itemType !== 'integer' &&
    itemType !== 'boolean' &&
    itemType !== 'object'
  ) {
    return advanced('unsupported_array_items', [
      `Field "${fieldKey}" has unsupported array item type.`,
    ]);
  }

  const itemTypeName = itemType as SupportedArrayItemType;
  if (itemTypeName === 'object') {
    return advanced('unsupported_array_items', [
      `Field "${fieldKey}" contains object array items that require advanced editing.`,
    ]);
  }

  return null;
}

function validateFields(schemaJson: Record<string, unknown>): SchemaUploadClassification | null {
  const properties = schemaJson.properties;
  if (!isPlainObject(properties)) {
    return advanced('unsupported_top_level_shape', ['Top-level `properties` must be an object.']);
  }

  for (const [fieldKey, rawDefinition] of Object.entries(properties)) {
    if (!isPlainObject(rawDefinition)) {
      return advanced('unsupported_field_shape', [`Field "${fieldKey}" must be an object.`]);
    }

    const complexKeys = Object.keys(rawDefinition).filter((key) => UNSUPPORTED_COMPLEX_KEYS.has(key));
    if (complexKeys.length > 0) {
      return advanced('unsupported_field_construct', [
        `Field "${fieldKey}" uses unsupported constructs: ${complexKeys.join(', ')}.`,
      ]);
    }

    const extraFieldKeys = Object.keys(rawDefinition).filter((key) => !FIELD_ALLOWED_KEYS.has(key));
    if (extraFieldKeys.length > 0) {
      return advanced('unsupported_field_keys', [
        `Field "${fieldKey}" uses unsupported keys: ${extraFieldKeys.join(', ')}.`,
      ]);
    }

    const typeParse = parseFieldType(rawDefinition.type);
    if (typeParse.baseType === null) {
      if (!Array.isArray(rawDefinition.enum)) {
        return advanced('unsupported_field_type', [`Field "${fieldKey}" has an unsupported type declaration.`]);
      }
    }

    if (rawDefinition.enum !== undefined) {
      const enumOk = Array.isArray(rawDefinition.enum) && rawDefinition.enum.every((item) => typeof item === 'string');
      if (!enumOk) {
        return advanced('unsupported_field_shape', [
          `Field "${fieldKey}" enum values must all be strings for wizard mode.`,
        ]);
      }
    }

    if (
      (typeParse.baseType === 'number' || typeParse.baseType === 'integer') &&
      rawDefinition.minimum !== undefined &&
      typeof rawDefinition.minimum !== 'number'
    ) {
      return advanced('unsupported_field_shape', [`Field "${fieldKey}" minimum must be a number.`]);
    }

    if (
      (typeParse.baseType === 'number' || typeParse.baseType === 'integer') &&
      rawDefinition.maximum !== undefined &&
      typeof rawDefinition.maximum !== 'number'
    ) {
      return advanced('unsupported_field_shape', [`Field "${fieldKey}" maximum must be a number.`]);
    }

    if (typeParse.baseType === 'string') {
      if (rawDefinition.pattern !== undefined && typeof rawDefinition.pattern !== 'string') {
        return advanced('unsupported_field_shape', [`Field "${fieldKey}" pattern must be a string.`]);
      }
      if (rawDefinition.format !== undefined && typeof rawDefinition.format !== 'string') {
        return advanced('unsupported_field_shape', [`Field "${fieldKey}" format must be a string.`]);
      }
    }

    if (typeParse.baseType === 'array') {
      const arrayCheck = validateArrayItems(fieldKey, rawDefinition);
      if (arrayCheck) return arrayCheck;
      if (rawDefinition.minItems !== undefined && typeof rawDefinition.minItems !== 'number') {
        return advanced('unsupported_field_shape', [`Field "${fieldKey}" minItems must be a number.`]);
      }
      if (rawDefinition.maxItems !== undefined && typeof rawDefinition.maxItems !== 'number') {
        return advanced('unsupported_field_shape', [`Field "${fieldKey}" maxItems must be a number.`]);
      }
    }

    if (typeParse.baseType === 'object') {
      const nestedProps = rawDefinition.properties;
      if (isPlainObject(nestedProps) && Object.keys(nestedProps).length > 0) {
        return advanced('unsupported_nested_object', [
          `Field "${fieldKey}" has nested properties; route to advanced editor.`,
        ]);
      }

      if (rawDefinition.additionalProperties !== undefined && rawDefinition.additionalProperties !== false) {
        return advanced('unsupported_nested_object', [
          `Field "${fieldKey}" uses non-false additionalProperties; route to advanced editor.`,
        ]);
      }
    }
  }

  return null;
}

export function classifySchemaForUpload(schemaJson: Record<string, unknown>): SchemaUploadClassification {
  const topLevelCheck = validateTopLevel(schemaJson);
  if (topLevelCheck) return topLevelCheck;

  const promptCheck = validatePromptConfig(schemaJson);
  if (promptCheck) return promptCheck;

  const fieldCheck = validateFields(schemaJson);
  if (fieldCheck) return fieldCheck;

  return {
    mode: 'wizard',
    reason: 'wizard_subset_compatible',
    warnings: ['Schema is compatible with the current wizard subset.'],
  };
}

export function parseSchemaUpload(uploadName: string, rawText: string): ParseUploadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    return {
      ok: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      error: 'Uploaded file must contain a top-level JSON object.',
    };
  }

  const schemaJson = parsed;
  const classification = classifySchemaForUpload(schemaJson);
  const suggestedSchemaRef = slugify(deriveBaseRef(schemaJson, uploadName));

  return {
    ok: true,
    draft: {
      uploadName,
      suggestedSchemaRef,
      schemaJson,
      classification,
      createdAt: new Date().toISOString(),
    },
  };
}

export function persistSchemaUploadDraft(draft: SchemaUploadDraft): string | null {
  if (typeof window === 'undefined') return null;
  const draftId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${draftId}`, JSON.stringify(draft));
    return draftId;
  } catch {
    return null;
  }
}

export function readSchemaUploadDraft(draftId: string): SchemaUploadDraft | null {
  if (!draftId || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${draftId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) return null;
    if (!isPlainObject(parsed.schemaJson) || !isPlainObject(parsed.classification)) return null;
    if (typeof parsed.uploadName !== 'string' || typeof parsed.suggestedSchemaRef !== 'string' || typeof parsed.createdAt !== 'string') {
      return null;
    }
    const mode = parsed.classification.mode;
    const reason = parsed.classification.reason;
    const warnings = parsed.classification.warnings;
    if ((mode !== 'wizard' && mode !== 'advanced') || typeof reason !== 'string' || !Array.isArray(warnings)) {
      return null;
    }
    return {
      uploadName: parsed.uploadName,
      suggestedSchemaRef: parsed.suggestedSchemaRef,
      schemaJson: parsed.schemaJson,
      classification: {
        mode,
        reason: reason as SchemaUploadClassificationReason,
        warnings: warnings.filter((item): item is string => typeof item === 'string'),
      },
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}
