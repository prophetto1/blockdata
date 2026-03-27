import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainObservabilityPage() {
  return (
    <AgchainSectionPage
      title="Observability"
      description="AG chain should use the host platform’s OpenTelemetry patterns for run traces, step events, provider metrics, and operational diagnostics."
      bullets={[
        'Observability is required from the start, not a later cosmetic add-on.',
        'Operational telemetry and benchmark audit artifacts are related but not interchangeable.',
        'This surface will show what happened internally while benchmark artifacts show benchmark truth.',
      ]}
    />
  );
}
