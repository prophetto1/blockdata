import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

type AgchainDatasetsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sourceTypeFilter: string | null;
  onSourceTypeChange: (value: string | null) => void;
  validationFilter: string | null;
  onValidationChange: (value: string | null) => void;
};

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'jsonl', label: 'JSONL' },
  { value: 'huggingface', label: 'HuggingFace' },
];

const VALIDATION_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pass', label: 'Pass' },
  { value: 'warn', label: 'Warn' },
  { value: 'fail', label: 'Fail' },
];

export function AgchainDatasetsToolbar({
  search,
  onSearchChange,
  sourceTypeFilter,
  onSourceTypeChange,
  validationFilter,
  onValidationChange,
}: AgchainDatasetsToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search datasets..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <select
        value={sourceTypeFilter ?? ''}
        onChange={(e) => onSourceTypeChange(e.target.value || null)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {SOURCE_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={validationFilter ?? ''}
        onChange={(e) => onValidationChange(e.target.value || null)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {VALIDATION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <Button asChild size="sm">
        <Link to="/app/agchain/datasets/new">+ Add Dataset</Link>
      </Button>
    </div>
  );
}
