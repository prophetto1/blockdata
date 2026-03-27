import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainArtifactsPage() {
  return (
    <AgchainSectionPage
      title="Artifacts"
      description="Raw benchmark artifacts remain a first-class product surface because they prove what happened during execution."
      bullets={[
        'This area will expose run logs, audit logs, manifests, summaries, and candidate-state artifacts.',
        'Artifact inspection should remain distinct from high-level results and from operational telemetry.',
        'Benchmark validity depends on making these outputs inspectable and repeatable.',
      ]}
    />
  );
}
