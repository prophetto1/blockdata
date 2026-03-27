import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainBenchmarksPage() {
  return (
    <AgchainSectionPage
      title="Benchmarks"
      description="Benchmark packages, versions, step plans, schemas, and scorer bindings will be managed here."
      bullets={[
        'Legal-10 will appear as the first registered benchmark package.',
        'Future benchmark packages must be able to coexist without forcing AG chain to become legal-specific.',
        'Package registry, versioning, and compatibility rules will anchor this surface.',
      ]}
    />
  );
}
