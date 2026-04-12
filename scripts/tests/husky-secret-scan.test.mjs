import test from 'node:test';
import assert from 'node:assert/strict';

async function loadModule() {
  return import('../husky/check-secrets.mjs').catch(() => ({}));
}

test('blocks PEM private key material in added lines', async () => {
  const { scanDiffForSecrets } = await loadModule();
  assert.equal(typeof scanDiffForSecrets, 'function', 'scanDiffForSecrets must be exported');

  const result = scanDiffForSecrets(`
diff --git a/test.txt b/test.txt
+++ b/test.txt
@@ -0,0 +1,2 @@
+-----BEGIN OPENSSH PRIVATE KEY-----
+abc123
`);

  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].reason, /private key/i);
});

test('allows placeholder examples in template files', async () => {
  const { scanDiffForSecrets } = await loadModule();
  assert.equal(typeof scanDiffForSecrets, 'function', 'scanDiffForSecrets must be exported');

  const result = scanDiffForSecrets(`
diff --git a/.env.example b/.env.example
+++ b/.env.example
@@ -0,0 +1,2 @@
+OPENAI_API_KEY=
+ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE
`);

  assert.equal(result.findings.length, 0);
});

test('blocks real secret-looking env assignments and token prefixes', async () => {
  const { scanDiffForSecrets } = await loadModule();
  assert.equal(typeof scanDiffForSecrets, 'function', 'scanDiffForSecrets must be exported');

  const result = scanDiffForSecrets(`
diff --git a/.env.local b/.env.local
+++ b/.env.local
@@ -0,0 +1,2 @@
+OPENAI_API_KEY=sk-real-secret
+GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuv
`);

  assert.equal(result.findings.length, 2);
  assert.match(result.findings[0].reason, /secret env var/i);
  assert.match(result.findings[1].reason, /token prefix/i);
});

test('allows suppressed examples only in docs, tests, and template-like files', async () => {
  const { scanDiffForSecrets } = await loadModule();
  assert.equal(typeof scanDiffForSecrets, 'function', 'scanDiffForSecrets must be exported');

  const docResult = scanDiffForSecrets(`
diff --git a/docs/example.md b/docs/example.md
+++ b/docs/example.md
@@ -0,0 +1,2 @@
+husky: allow-secret-example
++OPENAI_API_KEY=sk-example-token
`);
  const codeResult = scanDiffForSecrets(`
diff --git a/services/platform-api/app/main.py b/services/platform-api/app/main.py
+++ b/services/platform-api/app/main.py
@@ -0,0 +1,2 @@
+husky: allow-secret-example
++OPENAI_API_KEY=sk-example-token
`);

  assert.equal(docResult.findings.length, 0);
  assert.equal(codeResult.findings.length, 1);
});
