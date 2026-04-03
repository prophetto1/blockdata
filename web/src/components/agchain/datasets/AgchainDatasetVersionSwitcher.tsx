import type { AgchainDatasetVersionSummary } from '@/lib/agchainDatasets';
import {
  SelectRoot,
  SelectControl,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectHiddenSelect,
  createListCollection,
} from '@/components/ui/select';

type AgchainDatasetVersionSwitcherProps = {
  versions: AgchainDatasetVersionSummary[];
  selectedVersionId: string | null;
  onSelect: (versionId: string) => void;
};

export function AgchainDatasetVersionSwitcher({
  versions,
  selectedVersionId,
  onSelect,
}: AgchainDatasetVersionSwitcherProps) {
  const collection = createListCollection({
    items: versions.map((v) => ({
      label: `${v.version_label} (${v.sample_count.toLocaleString()} samples, ${v.validation_status})`,
      value: v.dataset_version_id,
    })),
  });

  return (
    <SelectRoot
      collection={collection}
      value={selectedVersionId ? [selectedVersionId] : []}
      onValueChange={(details) => {
        const val = details.value[0];
        if (val) onSelect(val);
      }}
      className="w-auto"
    >
      <SelectControl>
        <SelectTrigger className="h-9 min-w-[12rem] max-w-[20rem] text-sm">
          <SelectValueText placeholder="Select version" />
          <svg
            className="ml-1 h-4 w-4 shrink-0 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </SelectTrigger>
      </SelectControl>
      <SelectContent>
        {collection.items.map((item) => (
          <SelectItem key={item.value} item={item}>
            <SelectItemText>{item.label}</SelectItemText>
            <SelectItemIndicator>&#10003;</SelectItemIndicator>
          </SelectItem>
        ))}
      </SelectContent>
      <SelectHiddenSelect />
    </SelectRoot>
  );
}