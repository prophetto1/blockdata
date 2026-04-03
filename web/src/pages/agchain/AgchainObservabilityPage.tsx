import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainObservabilityPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Observability"
      description="AGChain should use the host platform's OpenTelemetry patterns for run traces, step events, provider metrics, and operational diagnostics once the rest of the project shell is actively in motion."
      bullets={[
        'Observability belongs near the bottom of the shell because it becomes most useful after datasets, prompts, scorers, parameters, and tools are being exercised.',
        'Operational telemetry and benchmark audit artifacts are related but not interchangeable.',
        'This surface will show what happened internally while benchmark artifacts continue to define benchmark truth.',
      ]}
    />
  );
}
