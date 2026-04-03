import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  SelectRoot,
  SelectControl,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectHiddenSelect,
  createListCollection,
} from '@/components/ui/select';

type AgchainDatasetsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sourceTypeFilter: string | null;
  onSourceTypeChange: (value: string | null) => void;
  validationFilter: string | null;
  onValidationChange: (value: string | null) => void;
};

const sourceTypeCollection = createListCollection({
  items: [
    { value: '', label: 'All types' },
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
    { value: 'jsonl', label: 'JSONL' },
    { value: 'huggingface', label: 'HuggingFace' },
  ],
});

const validationCollection = createListCollection({
  items: [
    { value: '', label: 'All statuses' },
    { value: 'pass', label: 'Pass' },
    { value: 'warn', label: 'Warn' },
    { value: 'fail', label: 'Fail' },
  ],
});

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

      <SelectRoot
        collection={sourceTypeCollection}
        value={[sourceTypeFilter ?? '']}
        onValueChange={(details) => onSourceTypeChange(details.value[0] || null)}
        className="w-auto"
      >
        <SelectControl>
          <SelectTrigger className="h-9 min-w-[8rem] text-sm">
            <SelectValueText placeholder="All types" />
          </SelectTrigger>
        </SelectControl>
        <SelectContent>
          {sourceTypeCollection.items.map((item) => (
            <SelectItem key={item.value} item={item}>
              <SelectItemText>{item.label}</SelectItemText>
            </SelectItem>
          ))}
        </SelectContent>
        <SelectHiddenSelect />
      </SelectRoot>

      <SelectRoot
        collection={validationCollection}
        value={[validationFilter ?? '']}
        onValueChange={(details) => onValidationChange(details.value[0] || null)}
        className="w-auto"
      >
        <SelectControl>
          <SelectTrigger className="h-9 min-w-[8rem] text-sm">
            <SelectValueText placeholder="All statuses" />
          </SelectTrigger>
        </SelectControl>
        <SelectContent>
          {validationCollection.items.map((item) => (
            <SelectItem key={item.value} item={item}>
              <SelectItemText>{item.label}</SelectItemText>
            </SelectItem>
          ))}
        </SelectContent>
        <SelectHiddenSelect />
      </SelectRoot>

      <Button asChild size="sm">
        <Link to="/app/agchain/datasets/new">+ Add Dataset</Link>
      </Button>
    </div>
  );
}
