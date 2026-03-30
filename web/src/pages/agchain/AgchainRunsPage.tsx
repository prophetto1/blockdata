import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainRunsPage() {
  return (
    <AgchainSectionPage
      title="Runs"
      description="Run setup, queue management, saved run profiles, and runtime policy controls will live here for the focused AGChain project or evaluation."
      bullets={[
        'Users will choose benchmark package, EU selection, evaluated model, and judge model here.',
        'Context delivery, statefulness, per-step versus single-call execution, and tool policies belong to the run configuration surface.',
        'Execution should be triggered through platform API patterns, not manual CLI invocation.',
      ]}
    />
  );
}
