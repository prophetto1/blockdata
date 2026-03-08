import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  applyProposalReview,
  normalizeProposalSource,
} from '../src/lib/proposals/workflow.mjs';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('normalizeProposalSource injects proposal metadata into raw markdown files', () => {
  const normalized = normalizeProposalSource('# Queue Routing Proposal\n\nThis is the body.', {
    filename: 'queue-routing-proposal.md',
    now: '2026-03-07T12:00:00.000Z',
    source: 'ai',
  });

  assert.match(normalized, /^---\n/);
  assert.match(normalized, /title: Queue Routing Proposal/);
  assert.match(normalized, /status: draft/);
  assert.match(normalized, /createdAt: 2026-03-07/);
  assert.match(normalized, /updatedAt: 2026-03-07/);
  assert.match(normalized, /source: ai/);
  assert.match(normalized, /proposalId: queue-routing-proposal/);
  assert.match(normalized, /# Queue Routing Proposal/);
});

run('applyProposalReview updates proposal metadata and appends an editorial assessment block', () => {
  const reviewed = applyProposalReview(
    `---
title: Queue Routing Proposal
status: submitted
createdAt: 2026-03-05
updatedAt: 2026-03-05
source: ai
proposalId: queue-routing-proposal
---

# Queue Routing Proposal

Original body.
`,
    {
      status: 'conditional-accept',
      reviewer: 'jon',
      note: 'Please tighten the acceptance criteria.',
      decidedAt: '2026-03-07T15:30:00.000Z',
    },
  );

  assert.match(reviewed, /status: conditional-accept/);
  assert.match(reviewed, /reviewedBy: jon/);
  assert.match(reviewed, /reviewedAt: 2026-03-07T15:30:00.000Z/);
  assert.match(reviewed, /updatedAt: 2026-03-07/);
  assert.match(reviewed, /decisionNotes: Please tighten the acceptance criteria\./);
  assert.match(reviewed, /## Editorial Assessment/);
  assert.match(reviewed, /### 2026-03-07 - Conditional Accept/);
  assert.match(reviewed, /Please tighten the acceptance criteria\./);
});

run('docs header links to the proposals workspace', () => {
  const docsHeader = readFileSync(new URL('../src/components/DocsHeader.astro', import.meta.url), 'utf8');

  assert.match(docsHeader, /href="\/proposals"/);
  assert.match(docsHeader, />Proposals</);
});

run('proposals workspace route exists with all workflow lanes', () => {
  const routePath = new URL('../src/pages/proposals/index.astro', import.meta.url);

  assert.equal(existsSync(routePath), true);

  const routeSource = readFileSync(routePath, 'utf8');
  assert.match(routeSource, /Workflow Lanes/);
  assert.match(routeSource, /PROPOSAL_STATUSES/);
  assert.match(routeSource, /Conditional Accept/);
  assert.match(routeSource, /Accept/);
  assert.match(routeSource, /Reject/);
});
