import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  auditHardcodedPaths,
  loadLocalPathNormalizerConfig,
  renderHardcodedPathAuditMarkdown,
  rewriteHardcodedPathsInText,
} from '../normalize-hardcoded-paths.mjs';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'normalize-hardcoded-paths-'));
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

test('rewriteHardcodedPathsInText converts repo-absolute Windows paths into canonical repo-relative paths', () => {
  const result = rewriteHardcodedPathsInText(
    'Path: E:\\blockdata-agchain\\docs\\sessions\\0407\\ai-tool-directory-inventory.md',
    {
      repoRoot: 'E:/blockdata-agchain',
      repoEntries: ['docs'],
    },
  );

  assert.equal(
    result.text,
    'Path: docs/sessions/0407/ai-tool-directory-inventory.md',
  );
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].replacement, 'docs/sessions/0407/ai-tool-directory-inventory.md');
  assert.equal(result.matches[0].kind, 'repo-absolute');
});

test('rewriteHardcodedPathsInText converts alias-root JSON paths into canonical repo-relative paths', () => {
  const result = rewriteHardcodedPathsInText(
    '{"path":"P:\\\\writing-system\\\\docs\\\\sessions\\\\0407\\\\ai-tool-directory-inventory.md"}',
    {
      repoRoot: 'E:/blockdata-agchain',
      aliasRoots: ['P:/writing-system'],
      repoEntries: ['docs'],
    },
  );

  assert.equal(
    result.text,
    '{"path":"docs/sessions/0407/ai-tool-directory-inventory.md"}',
  );
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].kind, 'repo-absolute');
});

test('loadLocalPathNormalizerConfig reads ignored local alias config files', () => {
  const root = makeTempDir();
  writeFile(path.join(root, '.codex', 'path-normalizer.local.json'), JSON.stringify({
    aliasRoots: ['P:/writing-system', 'E:/writing-system'],
    rootMaps: [{ from: 'Q:/Users/jwchu/.codex', to: 'machine/jon-codex' }],
  }, null, 2));

  const config = loadLocalPathNormalizerConfig({ repoRoot: root });

  assert.deepEqual(config.aliasRoots, ['P:/writing-system', 'E:/writing-system']);
  assert.deepEqual(config.rootMaps, [{ from: 'Q:/Users/jwchu/.codex', to: 'machine/jon-codex' }]);
  assert.deepEqual(
    config.sources.map((sourcePath) => path.relative(root, sourcePath).replace(/\\/g, '/')),
    ['.codex/path-normalizer.local.json'],
  );
});

test('rewriteHardcodedPathsInText can map alternate absolute prefixes into repo subtrees', () => {
  const result = rewriteHardcodedPathsInText(
    'Use P:\\engine\\workers\\registry.json as the source of truth.',
    {
      repoRoot: 'E:/blockdata-agchain',
      repoEntries: ['engine'],
      rootMaps: [{ from: 'P:/engine', to: 'engine' }],
    },
  );

  assert.equal(
    result.text,
    'Use engine/workers/registry.json as the source of truth.',
  );
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].replacement, 'engine/workers/registry.json');
});

test('rewriteHardcodedPathsInText normalizes repo-relative backslash paths to forward slashes', () => {
  const result = rewriteHardcodedPathsInText(
    'See docs\\sessions\\0407\\ai-tool-directory-inventory.md for details.',
    {
      repoRoot: 'E:/blockdata-agchain',
      repoEntries: ['docs'],
    },
  );

  assert.equal(
    result.text,
    'See docs/sessions/0407/ai-tool-directory-inventory.md for details.',
  );
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].kind, 'repo-relative');
});

test('rewriteHardcodedPathsInText reports external absolute paths without rewriting them', () => {
  const input = 'Python: C:\\Users\\buddy\\AppData\\Roaming\\uv\\python.exe';
  const result = rewriteHardcodedPathsInText(input, {
    repoRoot: 'E:/blockdata-agchain',
    repoEntries: ['docs', 'services'],
  });

  assert.equal(result.text, input);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].kind, 'external-absolute');
  assert.equal(result.matches[0].replacement, null);
});

test('rewriteHardcodedPathsInText stops repo-relative matches before escaped newline sequences', () => {
  const input = String.raw`See docs\\sessions\\0407\\ai-tool-directory-inventory.md\nNext`;
  const result = rewriteHardcodedPathsInText(input, {
    repoRoot: 'E:/blockdata-agchain',
    repoEntries: ['docs'],
  });

  assert.equal(
    result.text,
    String.raw`See docs/sessions/0407/ai-tool-directory-inventory.md\nNext`,
  );
  assert.equal(result.matches.length, 1);
  assert.equal(
    result.matches[0].original,
    String.raw`docs\\sessions\\0407\\ai-tool-directory-inventory.md`,
  );
  assert.equal(
    result.matches[0].replacement,
    'docs/sessions/0407/ai-tool-directory-inventory.md',
  );
});

test('rewriteHardcodedPathsInText captures full external absolute Windows paths with spaces', () => {
  const input = String.raw`IconResource=C:\Program Files\Google\Drive File Stream\123.0.1.0\GoogleDriveFS.exe,27`;
  const result = rewriteHardcodedPathsInText(input, {
    repoRoot: 'E:/blockdata-agchain',
    repoEntries: ['docs', 'services'],
  });

  assert.equal(result.text, input);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].kind, 'external-absolute');
  assert.equal(
    result.matches[0].original,
    String.raw`C:\Program Files\Google\Drive File Stream\123.0.1.0\GoogleDriveFS.exe`,
  );
});

test('rewriteHardcodedPathsInText splits external absolute paths separated by escaped newline text', () => {
  const input = String.raw`External: C:\Users\buddy\AppData\Roaming\uv\python.exe\nMirror: P:\writing-system\docs\sessions\0407\ai-tool-directory-inventory.md`;
  const result = rewriteHardcodedPathsInText(input, {
    repoRoot: 'E:/blockdata-agchain',
    repoEntries: ['docs', 'services'],
  });

  assert.equal(result.text, input);
  assert.equal(result.matches.length, 2);
  assert.deepEqual(
    result.matches.map((match) => match.original),
    [
      String.raw`C:\Users\buddy\AppData\Roaming\uv\python.exe`,
      String.raw`P:\writing-system\docs\sessions\0407\ai-tool-directory-inventory.md`,
    ],
  );
});

test('auditHardcodedPaths rewrites matching files when write mode is enabled', () => {
  const root = makeTempDir();
  writeFile(path.join(root, 'docs', '.keep'), '');
  writeFile(
    path.join(root, 'notes.md'),
    `Repo: ${root}\\docs\\sessions\\0407\\ai-tool-directory-inventory.md\nSee docs\\\\sessions\\\\0407\\\\ai-tool-directory-inventory.md\n`,
  );

  const report = auditHardcodedPaths({
    cwd: root,
    targets: ['notes.md'],
    write: true,
  });

  const rewritten = fs.readFileSync(path.join(root, 'notes.md'), 'utf8');

  assert.equal(
    rewritten,
    'Repo: docs/sessions/0407/ai-tool-directory-inventory.md\nSee docs/sessions/0407/ai-tool-directory-inventory.md\n',
  );
  assert.equal(report.changedFileCount, 1);
  assert.equal(report.fixableMatchCount, 2);
  assert.equal(report.unresolvedMatchCount, 0);
});

test('auditHardcodedPaths automatically applies local alias roots from ignored config', () => {
  const root = makeTempDir();
  writeFile(path.join(root, 'docs', '.keep'), '');
  writeFile(
    path.join(root, '.codex', 'path-normalizer.local.json'),
    JSON.stringify({ aliasRoots: ['P:/writing-system'] }, null, 2),
  );
  writeFile(
    path.join(root, 'notes.md'),
    'Mirror: P:\\writing-system\\docs\\sessions\\0407\\ai-tool-directory-inventory.md\n',
  );

  const report = auditHardcodedPaths({
    cwd: root,
    targets: ['notes.md'],
    write: true,
  });

  const rewritten = fs.readFileSync(path.join(root, 'notes.md'), 'utf8');

  assert.equal(
    rewritten,
    'Mirror: docs/sessions/0407/ai-tool-directory-inventory.md\n',
  );
  assert.deepEqual(report.localConfigSources, ['.codex/path-normalizer.local.json']);
  assert.equal(report.changedFileCount, 1);
  assert.equal(report.fixableMatchCount, 1);
  assert.equal(report.unresolvedMatchCount, 0);
});

test('auditHardcodedPaths can write a markdown report document before any fix pass', () => {
  const root = makeTempDir();
  writeFile(path.join(root, 'docs', '.keep'), '');
  writeFile(
    path.join(root, 'notes.md'),
    `Repo: ${root}\\docs\\sessions\\0407\\ai-tool-directory-inventory.md\nExternal: C:\\Users\\buddy\\AppData\\Roaming\\uv\\python.exe\n`,
  );

  const report = auditHardcodedPaths({
    cwd: root,
    targets: ['notes.md'],
    reportPath: 'output/reports/hardcoded-path-audit.md',
  });

  const writtenReport = fs.readFileSync(path.join(root, 'output', 'reports', 'hardcoded-path-audit.md'), 'utf8');

  assert.equal(report.changedFileCount, 0);
  assert.match(writtenReport, /# Hardcoded Path Audit/);
  assert.match(writtenReport, /notes\.md/);
  assert.match(writtenReport, /docs\/sessions\/0407\/ai-tool-directory-inventory\.md/);
  assert.match(writtenReport, /C:\\Users\\buddy\\AppData\\Roaming\\uv\\python\.exe/);
});

test('auditHardcodedPaths ignores desktop.ini noise by default', () => {
  const root = makeTempDir();
  writeFile(path.join(root, 'docs', '.keep'), '');
  writeFile(path.join(root, 'web', 'src', 'desktop.ini'), 'IconResource=C:\\Program Files\\Google\\Drive File Stream\\123.0.1.0\\GoogleDriveFS.exe,27\n');
  writeFile(path.join(root, 'notes.md'), `Repo: ${root}\\docs\\sessions\\0407\\ai-tool-directory-inventory.md\n`);

  const report = auditHardcodedPaths({
    cwd: root,
    targets: ['web', 'notes.md'],
  });

  assert.equal(report.issueCount, 1);
  assert.equal(report.issues[0].file, 'notes.md');
});

test('auditHardcodedPaths does not scan the generated report file itself', () => {
  const root = makeTempDir();
  writeFile(path.join(root, 'docs', '.keep'), '');
  writeFile(path.join(root, 'notes.md'), `Repo: ${root}\\docs\\sessions\\0407\\ai-tool-directory-inventory.md\n`);

  const firstReport = auditHardcodedPaths({
    cwd: root,
    targets: ['notes.md'],
    reportPath: 'reports/hardcoded-path-audit.md',
  });

  const secondReport = auditHardcodedPaths({
    cwd: root,
    targets: ['notes.md', 'reports'],
    reportPath: 'reports/hardcoded-path-audit.md',
  });

  assert.equal(firstReport.issueCount, 1);
  assert.equal(secondReport.issueCount, 1);
});

test('renderHardcodedPathAuditMarkdown keeps mounted fork paths unresolved by default', () => {
  const root = makeTempDir();
  writeFile(path.join(root, 'docs', '.keep'), '');
  writeFile(
    path.join(root, 'notes.md'),
    `Correct: docs/sessions/0407/ai-tool-directory-inventory.md\nRepo: ${root}\\docs\\sessions\\0407\\ai-tool-directory-inventory.md\nExternal: C:\\Users\\buddy\\AppData\\Roaming\\uv\\python.exe\nMirror: P:\\writing-system\\docs\\sessions\\0407\\ai-tool-directory-inventory.md\n`,
  );
  writeFile(
    path.join(root, 'integrations', 'azure', 'auth', 'oauth_access_token.py'),
    '# Source: E:\\KESTRA-IO\\plugins\\plugin-azure\\src\\main\\java\\io\\kestra\\plugin\\azure\\auth\\OauthAccessToken.java\n',
  );

  const report = auditHardcodedPaths({
    cwd: root,
    targets: ['notes.md', 'integrations'],
  });

  const markdown = renderHardcodedPathAuditMarkdown(report);

  assert.match(markdown, /\| Total paths found \| 5 \|/);
  assert.match(markdown, /\| Correct \| 1 \|/);
  assert.match(markdown, /\| Incorrect \| 4 \|/);
  assert.match(markdown, /## Incorrect Paths/);
  assert.match(markdown, /`P:\\writing-system\\docs\\sessions\\0407\\ai-tool-directory-inventory\.md` -> `No automatic rewrite`/);
  assert.match(markdown, /`C:\\Users\\buddy\\AppData\\Roaming\\uv\\python\.exe` -> `No automatic rewrite`/);
  assert.match(markdown, /`E:\\KESTRA-IO\\plugins\\plugin-azure\\src\\main\\java\\io\\kestra\\plugin\\azure\\auth\\OauthAccessToken\.java` -> `No automatic rewrite`/);
});
