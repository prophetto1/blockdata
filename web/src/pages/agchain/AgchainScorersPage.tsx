import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainScorersPage() {
  return (
    <AgchainSectionPage
      title="Scorers"
      description="Scorer definitions, judge rules, and scoring policies will live here for the selected AGChain project."
      bullets={[
        'Scorers remain AGChain-owned semantically even when the shell borrows Braintrust-like layout density.',
        'Judge and deterministic scoring rules need a first-class project surface instead of being buried inside benchmark editing.',
        'This placeholder reserves that shell slot without pretending the deeper scorer model is already implemented.',
      ]}
    />
  );
}
