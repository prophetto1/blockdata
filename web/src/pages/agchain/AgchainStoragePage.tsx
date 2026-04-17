import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainStoragePage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Storage"
      description="Harness storage bindings, persisted artifacts, and runtime data-store configuration will live here."
      bullets={[
        'Storage needs its own harness route because artifact retention and runtime persistence shape how the harness behaves over time.',
        'This surface will eventually configure databases, blobs, caches, and project-owned artifact sinks.',
        'The placeholder keeps the harness taxonomy explicit while those persistence seams are still being designed.',
      ]}
    />
  );
}
