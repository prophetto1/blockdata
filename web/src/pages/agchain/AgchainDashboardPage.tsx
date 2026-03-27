import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainDashboardPage() {
  return (
    <AgchainSectionPage
      title="Benchmark Runner Environment"
      description="AG chain is the dedicated benchmark workspace inside the platform. This shell is where benchmark packages, run orchestration, model selection, artifact inspection, and observability will come together."
      bullets={[
        'Recent runs, platform health, and quick-launch actions will live here.',
        'The shell is intentionally separate from the main app and admin workspaces so benchmark operations can evolve independently.',
        'This first slice establishes the workspace boundary before deeper backend execution and runtime controls are wired in.',
        'Legal-10 will land here as the first benchmark package, not as the definition of AG chain itself.',
      ]}
    />
  );
}
