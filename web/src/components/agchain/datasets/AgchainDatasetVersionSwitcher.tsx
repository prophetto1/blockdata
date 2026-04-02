import type { AgchainDatasetVersionSummary } from '@/lib/agchainDatasets';

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

  return (
    <div className="relative">
      <select
        value={selectedVersionId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="h-9 appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {versions.map((v) => (
          <option key={v.dataset_version_id} value={v.dataset_version_id}>
            {v.version_label} ({v.sample_count.toLocaleString()} samples, {v.validation_status})
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
