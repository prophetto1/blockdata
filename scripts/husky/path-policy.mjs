export const REVIEW_ONLY_DOC_EXTENSIONS = ['.md', '.mdx', '.txt'];
const DOC_EXTENSIONS = new Set(REVIEW_ONLY_DOC_EXTENSIONS);
const BLOCKING_CONFIG_EXTENSIONS = new Set(['.json', '.toml', '.yml', '.yaml']);

export const REVIEW_ONLY_DOC_POLICY_SUMMARY =
  'All `.md`, `.mdx`, and `.txt` files are review-only: hardcoded path findings are reported for review and do not block the commit.';

export const DOC_EXCEPTION_FILES = [
  '__start-here/2026-04-07-dual-pc-setup-internal-readme.md',
  'docs/sessions/0407/ai-tool-directory-inventory.md',
  'scripts/tests/docs-perspective-audit.test.mjs',
  'scripts/tests/hardcoded-path-audit.test.mjs',
];

const REVIEW_ONLY_PREFIXES = [
  'tools/path-normalizer/',
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
}

export function classifyPathPolicyScope(filePath) {
  const normalizedPath = normalizePath(filePath);

  if (normalizedPath.startsWith('.husky/')) {
    return 'block';
  }

  if (REVIEW_ONLY_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return 'review';
  }

  if (DOC_EXCEPTION_FILES.includes(normalizedPath)) {
    return 'review';
  }

  const lowerPath = normalizedPath.toLowerCase();
  if ([...DOC_EXTENSIONS].some((extension) => lowerPath.endsWith(extension))) {
    return 'review';
  }

  if (
    lowerPath.startsWith('scripts/') && ['.mjs', '.js', '.ps1', '.sh'].some((ext) => lowerPath.endsWith(ext))
  ) {
    return 'block';
  }

  if (lowerPath.startsWith('web/') && ['.ts', '.tsx'].some((ext) => lowerPath.endsWith(ext))) {
    return 'block';
  }

  if (lowerPath.startsWith('services/platform-api/') && lowerPath.endsWith('.py')) {
    return 'block';
  }

  if (lowerPath.startsWith('supabase/') && lowerPath.endsWith('.sql')) {
    return 'block';
  }

  if (BLOCKING_CONFIG_EXTENSIONS.has(lowerPath.slice(lowerPath.lastIndexOf('.')))) {
    return 'block';
  }

  return 'ignore';
}

export function getPolicyTargets(stagedFiles) {
  return stagedFiles
    .map(normalizePath)
    .filter((filePath) => classifyPathPolicyScope(filePath) !== 'ignore');
}
