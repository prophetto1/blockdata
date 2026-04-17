import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainLogsPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Logs"
      description="Run logs, judge output, and project-scoped execution event streams will live here."
      bullets={[
        'Logs need their own monitor slot so textual and event-heavy diagnostics do not get collapsed into score reporting.',
        'This surface will eventually expose runtime events, provider output, and operational diagnostics for the focused project.',
        'The placeholder preserves that monitor boundary while the log viewer patterns are still being designed.',
      ]}
    />
  );
}
