/**
 * Shared schema field types and conversion utilities for the visual schema builder.
 *
 * Used by both the standalone Schemas page and the Extract workbench.
 * Extended with `description` and `examples` for LLM extraction hints.
 */

import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SchemaFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'enum';

export type SchemaField = {
  id: string;
  name: string;
  type: SchemaFieldType;
  required: boolean;
  isArray: boolean;
  enumValues: string[];
  children: SchemaField[];
  /** LLM extraction hint — describes what this field contains. */
  description: string;
  /** Few-shot examples to guide LLM extraction. */
  examples: string[];
};

export type SchemaTypeOption = { value: SchemaFieldType; label: string };

export const SCHEMA_TYPE_OPTIONS: SchemaTypeOption[] = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'integer', label: 'integer' },
  { value: 'boolean', label: 'boolean' },
  { value: 'object', label: 'object' },
  { value: 'enum', label: 'enum' },
];

// ---------------------------------------------------------------------------
// Field factory
// ---------------------------------------------------------------------------

export function createSchemaField(seed?: Partial<SchemaField>): SchemaField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: seed?.name ?? '',
    type: seed?.type ?? 'string',
    required: seed?.required ?? true,
    isArray: seed?.isArray ?? false,
    enumValues: seed?.enumValues ?? (seed?.type === 'enum' ? [''] : []),
    children: seed?.children ?? [],
    description: seed?.description ?? '',
    examples: seed?.examples ?? [],
  };
}

// ---------------------------------------------------------------------------
// Visual fields → JSON Schema
// ---------------------------------------------------------------------------

export function buildObjectSchema(fields: SchemaField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const propertyOrdering: string[] = [];
  const required: string[] = [];

  fields.forEach((field) => {
    const propertyName = field.name.trim();
    if (!propertyName) return;

    let fieldSchema: Record<string, unknown>;

    if (field.type === 'object') {
      fieldSchema = buildObjectSchema(field.children);
    } else if (field.type === 'enum') {
      const enumValues = field.enumValues
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      fieldSchema = {
        type: 'string',
        ...(enumValues.length > 0 ? { enum: enumValues } : {}),
      };
    } else {
      fieldSchema = { type: field.type };
    }

    // Attach description and examples when present
    if (field.description.trim()) {
      fieldSchema.description = field.description.trim();
    }
    if (field.examples.length > 0) {
      const trimmed = field.examples.map((e) => e.trim()).filter(Boolean);
      if (trimmed.length > 0) {
        fieldSchema.examples = trimmed;
      }
    }

    const schemaNode = field.isArray
      ? { type: 'array', items: fieldSchema }
      : fieldSchema;

    properties[propertyName] = schemaNode;
    propertyOrdering.push(propertyName);
    if (field.required) required.push(propertyName);
  });

  return {
    type: 'object',
    properties,
    ...(propertyOrdering.length > 0 ? { propertyOrdering } : {}),
    ...(required.length > 0 ? { required } : {}),
  };
}

// ---------------------------------------------------------------------------
// JSON Schema → Visual fields
// ---------------------------------------------------------------------------

export function parseObjectSchemaToFields(schema: Record<string, unknown>): SchemaField[] {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return [];

  const requiredArr = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const requiredSet = new Set(requiredArr);
  const ordering = Array.isArray(schema.propertyOrdering)
    ? (schema.propertyOrdering as string[])
    : Object.keys(properties);

  return ordering
    .filter((name) => name in properties)
    .map((name) => {
      const prop = properties[name];
      const isArray = prop.type === 'array';
      const inner = isArray ? ((prop.items as Record<string, unknown>) ?? {}) : prop;

      let type: SchemaFieldType;
      let enumValues: string[] = [];
      let children: SchemaField[] = [];

      if (inner.type === 'object' || inner.properties) {
        type = 'object';
        children = parseObjectSchemaToFields(inner);
      } else if (Array.isArray(inner.enum)) {
        type = 'enum';
        enumValues = (inner.enum as unknown[]).map(String);
      } else {
        const rawType = inner.type as string;
        type = (['string', 'number', 'integer', 'boolean'].includes(rawType) ? rawType : 'string') as SchemaFieldType;
      }

      // Read description and examples from the inner schema node
      const description = typeof inner.description === 'string' ? inner.description : '';
      const examples = Array.isArray(inner.examples)
        ? (inner.examples as unknown[]).map(String)
        : [];

      return {
        id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        type,
        required: requiredSet.has(name),
        isArray,
        enumValues,
        children,
        description,
        examples,
      };
    });
}

// ---------------------------------------------------------------------------
// Schema UID generation
// ---------------------------------------------------------------------------

export async function computeSchemaUid(schemaBody: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(schemaBody);
  const data = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Monaco theme hook (shared)
// ---------------------------------------------------------------------------

function subscribeTheme(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(() => onStoreChange());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getMonacoTheme(): string {
  if (typeof document === 'undefined') return 'vs-dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'vs-dark';
}

export function useMonacoTheme(): string {
  return useSyncExternalStore(subscribeTheme, getMonacoTheme, () => 'vs-dark');
}
