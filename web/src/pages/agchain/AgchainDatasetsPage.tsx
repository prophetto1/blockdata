import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainDatasetsPage() {
  return (
    <AgchainSectionPage
      title="Datasets"
      description="Dataset registries, versions, samples, and import flows will live here for the selected AGChain project."
      bullets={[
        'Datasets become the primary sample-selection spine for project-level evaluation work.',
        'Versioning, sample metadata, and drill-down views should stay project-scoped rather than drifting into a global registry.',
        'This placeholder locks the shell slot before the richer backend dataset contract lands.',
      ]}
    />
  );
}
