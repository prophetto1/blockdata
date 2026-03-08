import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let proposalApi;
let proposalApiLoadError;

try {
  proposalApi = await import('../src/lib/proposals/api.mjs');
} catch (error) {
  proposalApiLoadError = error;
  proposalApi = new Proxy(
    {},
    {
      get() {
        throw proposalApiLoadError;
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
  const rootDir = await mkdtemp(join(tmpdir(), 'proposals-api-'));

  try {
    for (const [filename, source] of Object.entries(files)) {
      await writeFile(join(rootDir, filename), source, 'utf8');
    }

    await fn(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

await run('proposal JSON routes exist', () => {
  const listRoute = new URL('../src/pages/api/proposals/list.json.ts', import.meta.url);
  const singleRoute = new URL('../src/pages/api/proposals/[filename].json.ts', import.meta.url);

  assert.equal(existsSync(listRoute), true);
  assert.equal(existsSync(singleRoute), true);

  assert.match(readFileSync(listRoute, 'utf8'), /export const GET/);
  assert.match(readFileSync(singleRoute, 'utf8'), /export const GET/);
});

await run('list proposal API returns normalized list JSON', async () => {
  await withTempProposalRoot(
    {
      '2026-03-05-routing.md': `---
title: Routing Proposal
description: Route queue work.
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
    },
    async (rootDir) => {
      const response = await proposalApi.createProposalListResponse({ rootDir });
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(Object.keys(payload), ['ok', 'proposals']);
      assert.equal(payload.ok, true);
      assert.equal(payload.proposals.length, 1);
      assert.equal(payload.proposals[0].filename, '2026-03-05-routing.md');
      assert.equal(payload.proposals[0].status, 'submitted');
    },
  );
});

await run('single proposal API returns proposal JSON', async () => {
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

Body copy.
`,
    },
    async (rootDir) => {
      const response = await proposalApi.createProposalResponse({
        rootDir,
        filename: '2026-03-07-routing.md',
      });
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(Object.keys(payload), ['ok', 'proposal']);
      assert.equal(payload.ok, true);
      assert.equal(payload.proposal.filename, '2026-03-07-routing.md');
      assert.equal(payload.proposal.metadata.status, 'submitted');
      assert.equal(payload.proposal.body, '# Routing Proposal\n\nBody copy.\n');
    },
  );
});

await run('review proposal API returns JSON for application/json requests', async () => {
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
`,
    },
    async (rootDir) => {
      const response = await proposalApi.createProposalReviewResponse({
        rootDir,
        allowWrites: true,
        request: new Request('http://localhost/api/proposals/review', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            filename: '2026-03-07-routing.md',
            reviewer: 'jon',
            status: 'accepted',
            note: 'Ready to ship.',
            expectedUpdatedAt: '2026-03-07',
          }),
        }),
      });
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(Object.keys(payload), ['ok', 'proposal', 'error']);
      assert.equal(payload.ok, true);
      assert.equal(payload.error, null);
      assert.equal(payload.proposal.metadata.status, 'accepted');
    },
  );
});

await run('review proposal API rejects stale writes with 409', async () => {
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
`,
    },
    async (rootDir) => {
      const response = await proposalApi.createProposalReviewResponse({
        rootDir,
        allowWrites: true,
        request: new Request('http://localhost/api/proposals/review', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            filename: '2026-03-07-routing.md',
            reviewer: 'jon',
            status: 'accepted',
            note: 'Ready to ship.',
            expectedUpdatedAt: '2026-03-06',
          }),
        }),
      });
      const payload = await response.json();

      assert.equal(response.status, 409);
      assert.deepEqual(Object.keys(payload), ['ok', 'proposal', 'error']);
      assert.equal(payload.ok, false);
      assert.equal(payload.proposal, null);
      assert.match(payload.error, /changed since it was loaded/i);
    },
  );
});
