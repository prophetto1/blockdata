import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  normalizeDocsFile,
  normalizeDocsSource,
} from '../src/lib/docs/frontmatter-normalizer.mjs';

async function run(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await run('normalizeDocsSource adds title-only frontmatter and removes a leading H1', () => {
  const normalized = normalizeDocsSource(`# my-new-doc

Body copy.
`, {
    relativePath: 'guides/my-new-doc.md',
    now: '2026-03-08T12:00:00.000Z',
  });

  assert.equal(
    normalized,
    `---
title: my-new-doc
---

Body copy.
`,
  );
});

await run('normalizeDocsSource preserves nested Astro metadata while enforcing filename title', () => {
  const normalized = normalizeDocsSource(`---
title: Wrong Title
description: Existing description
sidebar:
  label: Custom Label
  hidden: true
hero:
  title: Hero Title
  tagline: Helpful copy
---

# Wrong Title

Body copy.
`, {
    relativePath: 'internal/docs-site-direction.md',
    now: '2026-03-08T12:00:00.000Z',
  });

  assert.match(normalized, /^---\n/);
  assert.match(normalized, /title: docs-site-direction/);
  assert.match(normalized, /description: Existing description/);
  assert.match(normalized, /sidebar:\n  label: Custom Label\n  hidden: true/);
  assert.match(normalized, /hero:\n  title: Hero Title\n  tagline: Helpful copy/);
  assert.doesNotMatch(normalized, /^# Wrong Title$/m);
  assert.match(normalized, /\nBody copy\.\n$/);
});

await run('normalizeDocsSource fixes malformed frontmatter closure lines like ---# Heading', () => {
  const normalized = normalizeDocsSource(`---
title: The Blockdata Pipeline
description: Existing description
---# The Blockdata Pipeline

Body copy.
`, {
    relativePath: 'blockdata.md',
    now: '2026-03-08T12:00:00.000Z',
  });

  assert.equal(
    normalized,
    `---
title: blockdata
description: Existing description
---

Body copy.
`,
  );
});

await run('normalizeDocsSource initializes proposal metadata for proposal docs', () => {
  const normalized = normalizeDocsSource(`---
description: Proposal description
---

# Queue Routing Proposal

Proposal body.
`, {
    relativePath: 'proposals/2026-03-07-queue-routing-proposal.md',
    now: '2026-03-08T12:00:00.000Z',
  });

  assert.match(normalized, /title: 2026-03-07-queue-routing-proposal/);
  assert.match(normalized, /description: Proposal description/);
  assert.match(normalized, /status: draft/);
  assert.match(normalized, /author: ""/);
  assert.match(normalized, /createdAt: 2026-03-07/);
  assert.match(normalized, /updatedAt: 2026-03-07/);
  assert.match(normalized, /source: manual/);
  assert.match(normalized, /proposalId: 2026-03-07-queue-routing-proposal/);
  assert.match(normalized, /reviewedBy: ""/);
  assert.match(normalized, /reviewedAt: ""/);
  assert.match(normalized, /decisionNotes: ""/);
  assert.doesNotMatch(normalized, /^# Queue Routing Proposal$/m);
});

await run('normalizeDocsFile is idempotent and does not rewrite already-normalized files', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'docs-frontmatter-'));

  try {
    const filePath = join(rootDir, 'guide.md');
    const initial = `---
title: guide
---

Body copy.
`;

    await writeFile(filePath, initial, 'utf8');

    const first = await normalizeDocsFile(filePath, {
      rootDir,
      relativePath: 'guide.md',
      now: '2026-03-08T12:00:00.000Z',
    });
    const second = await normalizeDocsFile(filePath, {
      rootDir,
      relativePath: 'guide.md',
      now: '2026-03-08T12:00:00.000Z',
    });

    const finalSource = await readFile(filePath, 'utf8');

    assert.equal(first.changed, false);
    assert.equal(second.changed, false);
    assert.equal(finalSource, initial);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
