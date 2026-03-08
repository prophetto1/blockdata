import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync as readFileSyncLegacy } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as workflow from '../src/lib/proposals/workflow.mjs';

let repository;
let repositoryLoadError;

try {
  repository = await import('../src/lib/proposals/repository.mjs');
} catch (error) {
  repositoryLoadError = error;
  repository = new Proxy(
    {},
    {
      get() {
        throw repositoryLoadError;
      },
    },
  );
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function withTempProposalRoot(files, fn) {
  const rootDir = await mkdtemp(join(tmpdir(), 'proposals-repository-'));

  try {
    for (const [filename, source] of Object.entries(files)) {
      await writeFile(join(rootDir, filename), source, 'utf8');
    }

    await fn(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

await run('parseProposalDocument returns structured frontmatter and body', () => {
  const parsed = workflow.parseProposalDocument(`---
title: Queue Routing Proposal
description: Route queue work through shared metadata.
status: submitted
author: jon
createdAt: 2026-03-07
updatedAt: 2026-03-07
source: human
proposalId: queue-routing-proposal
reviewedBy:
reviewedAt:
decisionNotes:
---

# Queue Routing Proposal

This is the body.
`);

  assert.deepEqual(parsed.metadata, {
    title: 'Queue Routing Proposal',
    description: 'Route queue work through shared metadata.',
    status: 'submitted',
    author: 'jon',
    createdAt: '2026-03-07',
    updatedAt: '2026-03-07',
    source: 'human',
    proposalId: 'queue-routing-proposal',
    reviewedBy: '',
    reviewedAt: '',
    decisionNotes: '',
  });
  assert.equal(parsed.body, '# Queue Routing Proposal\n\nThis is the body.\n');
});

await run('validateProposalStatusTransition allows draft to submitted', () => {
  assert.equal(workflow.validateProposalStatusTransition('draft', 'submitted'), true);
});

await run('validateProposalStatusTransition allows submitted decisions', () => {
  assert.equal(workflow.validateProposalStatusTransition('submitted', 'conditional-accept'), true);
  assert.equal(workflow.validateProposalStatusTransition('submitted', 'accepted'), true);
  assert.equal(workflow.validateProposalStatusTransition('submitted', 'rejected'), true);
});

await run('validateProposalStatusTransition rejects invalid jumps', () => {
  assert.equal(workflow.validateProposalStatusTransition('draft', 'accepted'), false);
});

await run('proposal domain types are defined in types.ts', () => {
  const source = readFileSyncLegacy(new URL('../src/lib/proposals/types.ts', import.meta.url), 'utf8');

  assert.match(source, /export type ProposalStatus/);
  assert.match(source, /export type ProposalFrontmatter/);
  assert.match(source, /export type ProposalSummary/);
  assert.match(source, /export type ProposalReviewInput/);
});

await run('listProposals returns normalized summaries sorted by updatedAt', async () => {
  await withTempProposalRoot(
    {
      '2026-03-05-routing.md': `---
title: Routing Proposal
description: Route traffic.
status: submitted
author: jon
createdAt: 2026-03-05
updatedAt: 2026-03-05
source: human
proposalId: routing-proposal
reviewedBy:
reviewedAt:
decisionNotes:
---

# Routing Proposal
`,
      '2026-03-07-indexing.md': `---
title: Indexing Proposal
description: Index documents.
status: draft
author: jon
createdAt: 2026-03-07
updatedAt: 2026-03-07
source: human
proposalId: indexing-proposal
reviewedBy:
reviewedAt:
decisionNotes:
---

# Indexing Proposal
`,
    },
    async (rootDir) => {
      const proposals = await repository.listProposals({ rootDir });

      assert.deepEqual(
        proposals.map((proposal) => proposal.filename),
        ['2026-03-07-indexing.md', '2026-03-05-routing.md'],
      );
      assert.equal(proposals[0].title, 'Indexing Proposal');
      assert.equal(proposals[1].status, 'submitted');
    },
  );
});

await run('readProposal returns proposal metadata plus markdown body', async () => {
  await withTempProposalRoot(
    {
      '2026-03-07-routing.md': `---
title: Routing Proposal
description: Route queue work.
status: submitted
author: jon
createdAt: 2026-03-07
updatedAt: 2026-03-07
source: human
proposalId: routing-proposal
reviewedBy:
reviewedAt:
decisionNotes:
---

# Routing Proposal

This is the body.
`,
    },
    async (rootDir) => {
      const proposal = await repository.readProposal({
        rootDir,
        filename: '2026-03-07-routing.md',
      });

      assert.equal(proposal.filename, '2026-03-07-routing.md');
      assert.equal(proposal.metadata.status, 'submitted');
      assert.equal(proposal.body, '# Routing Proposal\n\nThis is the body.\n');
    },
  );
});

await run('writeProposalReview updates status, review fields, and appends assessment text', async () => {
  await withTempProposalRoot(
    {
      '2026-03-07-routing.md': `---
title: Routing Proposal
description: Route queue work.
status: submitted
author: jon
createdAt: 2026-03-07
updatedAt: 2026-03-07
source: human
proposalId: routing-proposal
reviewedBy:
reviewedAt:
decisionNotes:
---

# Routing Proposal

This is the body.
`,
    },
    async (rootDir) => {
      await repository.writeProposalReview({
        rootDir,
        filename: '2026-03-07-routing.md',
        reviewer: 'jon',
        status: 'accepted',
        note: 'Ready to ship.',
      });

      const proposal = await repository.readProposal({
        rootDir,
        filename: '2026-03-07-routing.md',
      });
      const persisted = await readFile(join(rootDir, '2026-03-07-routing.md'), 'utf8');

      assert.equal(proposal.metadata.status, 'accepted');
      assert.equal(proposal.metadata.reviewedBy, 'jon');
      assert.equal(proposal.metadata.decisionNotes, 'Ready to ship.');
      assert.match(proposal.metadata.reviewedAt, /^\d{4}-\d{2}-\d{2}T/);
      assert.match(persisted, /## Editorial Assessment/);
      assert.match(persisted, /Ready to ship\./);
    },
  );
});

await run('writeProposalReview throws on invalid status transitions', async () => {
  await withTempProposalRoot(
    {
      '2026-03-07-routing.md': `---
title: Routing Proposal
description: Route queue work.
status: draft
author: jon
createdAt: 2026-03-07
updatedAt: 2026-03-07
source: human
proposalId: routing-proposal
reviewedBy:
reviewedAt:
decisionNotes:
---

# Routing Proposal
`,
    },
    async (rootDir) => {
      await assert.rejects(
        repository.writeProposalReview({
          rootDir,
          filename: '2026-03-07-routing.md',
          reviewer: 'jon',
          status: 'accepted',
          note: 'Skipping review.',
        }),
        /Invalid proposal status transition/,
      );
    },
  );
});
