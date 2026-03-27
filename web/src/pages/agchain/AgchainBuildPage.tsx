import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainBuildPage() {
  return (
    <AgchainSectionPage
      title="Build"
      description="Build-time authoring stays separate from runtime execution. This workspace will eventually absorb the EU builder, RP builder, bundle materialization, and validation workflows."
      bullets={[
        'DuckDB and raw reference data belong to build-time only, not runtime execution.',
        'Evaluation units are the self-contained artifacts the runner should load and execute.',
        'Validation and integrity checks belong here before a package is allowed to run.',
      ]}
    />
  );
}
