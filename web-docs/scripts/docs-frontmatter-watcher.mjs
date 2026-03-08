import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  normalizeDocsTree,
  watchDocsFrontmatter,
} from '../src/lib/docs/frontmatter-normalizer.mjs';

const DEFAULT_DOCS_ROOT = new URL('../src/content/docs/', import.meta.url);

function parseArgs(argv) {
  return {
    once: argv.includes('--once'),
  };
}

async function main() {
  const { once } = parseArgs(process.argv.slice(2));
  const rootDir = resolve(fileURLToPath(DEFAULT_DOCS_ROOT));

  if (once) {
    const result = await normalizeDocsTree({ rootDir });
    console.log(`Docs normalization complete. Changed ${result.changed} file(s).`);
    return;
  }

  console.log(`Watching ${rootDir} for docs saves...`);
  watchDocsFrontmatter({ rootDir });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
