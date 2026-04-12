import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

async function loadModules() {
  const [policyModule, checkerModule] = await Promise.all([
    import('../husky/path-policy.mjs').catch(() => ({})),
    import('../husky/check-hardcoded-paths.mjs').catch(() => ({})),
  ]);

  return {
    DOC_EXCEPTION_FILES: policyModule.DOC_EXCEPTION_FILES,
    REVIEW_ONLY_DOC_POLICY_SUMMARY: policyModule.REVIEW_ONLY_DOC_POLICY_SUMMARY,
    classifyPathPolicyScope: policyModule.classifyPathPolicyScope,
    checkHardcodedPaths: checkerModule.checkHardcodedPaths,
  };
}

test('classifies blocking-scope code files and review-only exception docs', async () => {
  const { DOC_EXCEPTION_FILES, classifyPathPolicyScope } = await loadModules();
  assert.ok(Array.isArray(DOC_EXCEPTION_FILES), 'DOC_EXCEPTION_FILES must be exported');
  assert.equal(typeof classifyPathPolicyScope, 'function', 'classifyPathPolicyScope must be exported');

  assert.deepEqual(DOC_EXCEPTION_FILES, [
    '__start-here/2026-04-07-dual-pc-setup-internal-readme.md',
    'docs/sessions/0407/ai-tool-directory-inventory.md',
  ]);
  assert.equal(classifyPathPolicyScope('services/platform-api/app/main.py'), 'block');
  assert.equal(classifyPathPolicyScope('__start-here/2026-04-07-dual-pc-setup-internal-readme.md'), 'review');
  assert.equal(classifyPathPolicyScope('docs/notes/example.md'), 'review');
  assert.equal(classifyPathPolicyScope('docs/image.png'), 'ignore');
});

test('documents the same review-only doc policy and tracked operational docs in the usage guide', async () => {
  const { DOC_EXCEPTION_FILES, REVIEW_ONLY_DOC_POLICY_SUMMARY } = await loadModules();
  assert.ok(Array.isArray(DOC_EXCEPTION_FILES), 'DOC_EXCEPTION_FILES must be exported');
  assert.equal(typeof REVIEW_ONLY_DOC_POLICY_SUMMARY, 'string', 'REVIEW_ONLY_DOC_POLICY_SUMMARY must be exported');

  const guidePath = fileURLToPath(new URL('../../web-docs/src/content/docs/internal/husky-hook-usage-guide.md', import.meta.url));
  const guideText = fs.readFileSync(guidePath, 'utf8');
  const documentedExceptionsMatch = guideText.match(
    /<!-- husky-path-policy-docs:start -->\s*([\s\S]*?)\s*<!-- husky-path-policy-docs:end -->/,
  );

  assert.ok(guideText.includes(REVIEW_ONLY_DOC_POLICY_SUMMARY), 'usage guide must carry the canonical review-only doc policy summary');
  assert.ok(documentedExceptionsMatch, 'usage guide must carry the tracked operational docs marker block');

  const documentedExceptions = documentedExceptionsMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').replace(/^`|`$/g, ''));

  assert.deepEqual(documentedExceptions, DOC_EXCEPTION_FILES);
});

test('blocks hardcoded machine paths in blocking-scope files', async () => {
  const { checkHardcodedPaths } = await loadModules();
  assert.equal(typeof checkHardcodedPaths, 'function', 'checkHardcodedPaths must be exported');

  const result = checkHardcodedPaths({
    stagedFiles: ['services/platform-api/app/main.py'],
    auditImpl() {
      return {
        issues: [
          {
            file: 'services/platform-api/app/main.py',
            line: 12,
            column: 8,
            original: 'E:/writing-system/services/platform-api/app/main.py',
          },
        ],
      };
    },
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.blockingIssues.length, 1);
  assert.equal(result.reviewIssues.length, 0);
});

test('keeps explicit operational doc exceptions non-blocking', async () => {
  const { checkHardcodedPaths } = await loadModules();
  assert.equal(typeof checkHardcodedPaths, 'function', 'checkHardcodedPaths must be exported');

  const result = checkHardcodedPaths({
    stagedFiles: ['__start-here/2026-04-07-dual-pc-setup-internal-readme.md'],
    auditImpl() {
      return {
        issues: [
          {
            file: '__start-here/2026-04-07-dual-pc-setup-internal-readme.md',
            line: 3,
            column: 1,
            original: 'E:/writing-system',
          },
        ],
      };
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.blockingIssues.length, 0);
  assert.equal(result.reviewIssues.length, 1);
});
