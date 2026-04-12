import test from 'node:test';
import assert from 'node:assert/strict';

async function loadModule() {
  return import('../husky/check-protected-push.mjs').catch(() => ({}));
}

test('blocks direct pushes to master, including HEAD:master', async () => {
  const { evaluateProtectedPush } = await loadModule();
  assert.equal(typeof evaluateProtectedPush, 'function', 'evaluateProtectedPush must be exported');

  const result = evaluateProtectedPush(`
refs/heads/feature/test 1111111111111111111111111111111111111111 refs/heads/master 2222222222222222222222222222222222222222
HEAD 3333333333333333333333333333333333333333 refs/heads/master 4444444444444444444444444444444444444444
`);

  assert.equal(result.violations.length, 2);
  assert.match(result.violations[0].reason, /master/i);
  assert.match(result.violations[1].reason, /master/i);
});

test('blocks remote delete operations for branches and tags', async () => {
  const { evaluateProtectedPush } = await loadModule();
  assert.equal(typeof evaluateProtectedPush, 'function', 'evaluateProtectedPush must be exported');

  const result = evaluateProtectedPush(`
refs/heads/feature/test 0000000000000000000000000000000000000000 refs/heads/feature/test 5555555555555555555555555555555555555555
refs/tags/release/v1 0000000000000000000000000000000000000000 refs/tags/release/v1 6666666666666666666666666666666666666666
`);

  assert.equal(result.violations.length, 2);
  assert.match(result.violations[0].reason, /delete/i);
  assert.match(result.violations[1].reason, /delete/i);
});

test('allows feature branch pushes that do not target master or delete refs', async () => {
  const { evaluateProtectedPush } = await loadModule();
  assert.equal(typeof evaluateProtectedPush, 'function', 'evaluateProtectedPush must be exported');

  const result = evaluateProtectedPush(`
refs/heads/feature/test 1111111111111111111111111111111111111111 refs/heads/feature/test 2222222222222222222222222222222222222222
`);

  assert.equal(result.violations.length, 0);
});
