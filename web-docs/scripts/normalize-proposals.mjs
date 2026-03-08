import { join } from 'node:path';

import {
  listProposals,
  normalizeProposalFile,
} from '../src/lib/proposals/repository.mjs';

const proposalsDir = new URL('../src/content/docs/proposals/', import.meta.url);

async function main() {
  const proposals = await listProposals({ rootDir: proposalsDir });

  for (const proposal of proposals) {
    const result = await normalizeProposalFile({
      rootDir: proposalsDir,
      filename: proposal.filename,
    });

    if (result.changed) {
      console.log(`Normalized ${join('src/content/docs/proposals', proposal.filename)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
