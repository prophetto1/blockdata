/**
 * Keystatic route mapping — single source of truth.
 *
 * Defines which docs-relative prefixes map to which Keystatic
 * collection/singleton names. Both keystatic.config.ts and
 * content-tree.mjs import from here.
 *
 * Rules:
 *   - collectionRoutes: prefix → collection name
 *     Sorted longest-prefix-first at build time (most specific wins).
 *   - singletonRoutes: exact relative path → singleton name
 *
 * To add a new docs folder with Keystatic editing:
 *   1. Add the collection in keystatic.config.ts
 *   2. Add the prefix here
 *   That's it — content-tree.mjs picks it up automatically.
 */

const DOCS_ROOT = 'src/content/docs';

/**
 * Each entry: [keystatic collection name, path glob from keystatic.config.ts]
 * The glob is the collection's `path` property value.
 * Prefix is derived automatically by stripping DOCS_ROOT and trailing /*
 */
const collectionDefs = [
  ['internalDocs', `${DOCS_ROOT}/internal/*`],
  ['styleGuide', `${DOCS_ROOT}/internal/style-guide/*`],
  ['contracts', `${DOCS_ROOT}/internal/style-guide/current-configs/*`],
  ['kestraAnalysis', `${DOCS_ROOT}/internal/analysis/kestra/*`],
  ['aiAnalysis', `${DOCS_ROOT}/internal/analysis/ai/*`],
  ['infrastructureDocs', `${DOCS_ROOT}/infrastructure/*`],
  ['proposals', `${DOCS_ROOT}/proposals/*`],
];

/**
 * Singletons: exact relative path (relative to DOCS_ROOT) → singleton name.
 */
const singletonDefs = [
  ['siteHome', `${DOCS_ROOT}/index.mdx`],
  ['gettingStarted', `${DOCS_ROOT}/getting-started.md`],
];

// ── Derived data (computed once at import time) ──

function stripDocsRoot(globPath) {
  // 'src/content/docs/internal/style-guide/*' → 'internal/style-guide/'
  const withoutRoot = globPath.slice(DOCS_ROOT.length + 1); // drop 'src/content/docs/'
  return withoutRoot.replace(/\*$/, '');                      // drop trailing *
}

/**
 * Collection routes sorted longest-prefix-first.
 * Each entry: [prefix, collectionName]
 *   prefix: 'internal/style-guide/current-configs/'
 */
export const collectionRoutes = collectionDefs
  .map(([name, glob]) => [stripDocsRoot(glob), name])
  .sort((a, b) => b[0].length - a[0].length);

/**
 * Singleton routes as a Map.
 * Key: relative path from docs root (e.g. 'index.mdx')
 * Value: singleton name
 */
export const singletonRoutes = new Map(
  singletonDefs.map(([name, path]) => [path.slice(DOCS_ROOT.length + 1), name]),
);

/**
 * Collection paths for keystatic.config.ts to consume.
 * Key: collection name, Value: full glob path
 */
export const collectionPaths = Object.fromEntries(
  collectionDefs.map(([name, glob]) => [name, glob]),
);

/**
 * Singleton paths for keystatic.config.ts to consume.
 * Key: singleton name, Value: full file path
 */
export const singletonPaths = Object.fromEntries(
  singletonDefs.map(([name, path]) => [name, path]),
);

export { DOCS_ROOT };
