import { useState } from 'react';
import type { AgchainFieldSpec } from '@/lib/agchainDatasets';

type AgchainDatasetFieldMappingEditorProps = {
  fieldSpec: AgchainFieldSpec;
  onChange: (spec: AgchainFieldSpec) => void;
};

type FieldDef = {
  key: keyof AgchainFieldSpec;
  label: string;
  description: string;
};

const REQUIRED_FIELDS: FieldDef[] = [
  { key: 'input', label: 'input', description: 'User prompt or query' },
  { key: 'messages', label: 'messages', description: 'Conversation history' },
  { key: 'target', label: 'target', description: 'Desired output or ground truth' },
];

const COMMON_OPTIONAL_FIELDS: FieldDef[] = [
  { key: 'id', label: 'id', description: 'Unique identifier' },
  { key: 'choices', label: 'choices', description: 'Possible answer options' },
];

const ADVANCED_FIELDS: FieldDef[] = [
  { key: 'sandbox', label: 'sandbox', description: 'Execution environment' },
  { key: 'files', label: 'files', description: 'Associated files' },
  { key: 'setup', label: 'setup', description: 'Initialization script' },
];

function getPathValue(spec: AgchainFieldSpec, key: keyof AgchainFieldSpec): string {
  const obj = spec[key];
  if (obj && typeof obj === 'object' && 'path' in obj) {
    return String(obj.path);
  }
  return '';
}

function setPathValue(spec: AgchainFieldSpec, key: keyof AgchainFieldSpec, value: string): AgchainFieldSpec {
  return {
    ...spec,
    [key]: value ? { path: value } : null,
  };
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-md border border-border/50 bg-background/50 px-4 py-3">
      <div className="flex-1">
        <span className="text-sm font-semibold text-foreground">{field.label}</span>
        <span className="ml-2 text-xs text-muted-foreground">{field.description}</span>
      </div>
      <input
        type="text"
        placeholder={`$.${field.key}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-48 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export function AgchainDatasetFieldMappingEditor({
  fieldSpec,
  onChange,
}: AgchainDatasetFieldMappingEditorProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleChange = (key: keyof AgchainFieldSpec, value: string) => {
    onChange(setPathValue(fieldSpec, key, value));
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Required</h3>
        <div className="flex flex-col gap-2">
          {REQUIRED_FIELDS.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={getPathValue(fieldSpec, field.key)}
              onChange={(value) => handleChange(field.key, value)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Common optional</h3>
        <div className="flex flex-col gap-2">
          {COMMON_OPTIONAL_FIELDS.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={getPathValue(fieldSpec, field.key)}
              onChange={(value) => handleChange(field.key, value)}
            />
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-foreground/80"
        >
          Advanced
          <svg
            className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {advancedOpen && (
          <div className="mt-2 flex flex-col gap-2">
            {ADVANCED_FIELDS.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                value={getPathValue(fieldSpec, field.key)}
                onChange={(value) => handleChange(field.key, value)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
