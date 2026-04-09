import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  listStrictScriptTargets,
  runStrictScriptsPathAudit,
} from '../normalize-scripts-hardcoded-paths.mjs';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'normalize-scripts-hardcoded-paths-'));
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

test('listStrictScriptTargets keeps runnable script sources and skips reports, logs, fixtures, and tests', () => {
  const root = makeTempDir();
  writeFile(path.join(root, 'scripts', 'keep', 'convert.mjs'), 'console.log("ok");\n');
  writeFile(path.join(root, 'scripts', 'run.ps1'), 'Write-Host "ok"\n');
  writeFile(path.join(root, 'scripts', 'path-normalizer', 'reports', 'hardcoded-path-audit.md'), '# report\n');
  writeFile(path.join(root, 'scripts', 'path-normalizer', 'tests', 'fixture.test.mjs'), 'console.log("fixture");\n');
  writeFile(path.join(root, 'scripts', 'logs', 'run.jsonl'), '{"ok":true}\n');
  writeFile(path.join(root, 'scripts', 'notes.txt'), 'ignore me\n');

  const targets = listStrictScriptTargets({ cwd: root });

  assert.deepEqual(targets, [
    'scripts/keep/convert.mjs',
    'scripts/run.ps1',
  ]);
});

test('runStrictScriptsPathAudit rewrites only curated script targets and leaves excluded fixtures untouched', () => {
  const root = makeTempDir();
  writeFile(
    path.join(root, 'scripts', 'keep', 'convert.mjs'),
    `const registry = "${root}\\scripts\\keep\\registry.json";\n`,
  );
  writeFile(
    path.join(root, 'scripts', 'path-normalizer', 'tests', 'fixture.test.mjs'),
    `const fixture = "${root}\\scripts\\keep\\registry.json";\n`,
  );

  const report = runStrictScriptsPathAudit({
    cwd: root,
    write: true,
    reportPath: 'scripts/path-normalizer/reports/scripts-hardcoded-path-audit.md',
  });

  const rewrittenSource = fs.readFileSync(path.join(root, 'scripts', 'keep', 'convert.mjs'), 'utf8');
  const untouchedFixture = fs.readFileSync(path.join(root, 'scripts', 'path-normalizer', 'tests', 'fixture.test.mjs'), 'utf8');
  const writtenReport = fs.readFileSync(
    path.join(root, 'scripts', 'path-normalizer', 'reports', 'scripts-hardcoded-path-audit.md'),
    'utf8',
  );

  assert.equal(rewrittenSource, 'const registry = "scripts/keep/registry.json";\n');
  assert.equal(untouchedFixture, `const fixture = "${root}\\scripts\\keep\\registry.json";\n`);
  assert.equal(report.changedFileCount, 1);
  assert.equal(report.issueCount, 1);
  assert.match(writtenReport, /scripts\/keep\/convert\.mjs/);
  assert.doesNotMatch(writtenReport, /fixture\.test\.mjs/);
});
