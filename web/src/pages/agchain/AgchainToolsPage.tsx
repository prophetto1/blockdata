import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainToolsPage() {
  return (
    <AgchainSectionPage
      title="Tools"
      description="Tooling, sandbox policy, and project-side helper integrations will live here."
      bullets={[
        'Tools need to be visible at level 1 because they shape how AGChain projects execute, not just how they are observed.',
        'This surface will eventually coordinate project tool registration, safety posture, and execution affordances.',
        'The placeholder makes the shell stable now without overcommitting to unfinished backend semantics.',
      ]}
    />
  );
}
