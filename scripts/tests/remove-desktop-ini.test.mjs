import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../_collaborate/scripts/repo-hygiene/remove-desktop-ini.mjs');

async function loadCleanupModule() {
  return import('../../_collaborate/scripts/repo-hygiene/remove-desktop-ini.mjs').catch(() => ({}));
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'writing-system-husky-'));
}

test('removes desktop.ini from both the work tree and git metadata directory', async () => {
  const { cleanupDesktopIni } = await loadCleanupModule();
  assert.equal(typeof cleanupDesktopIni, 'function', 'cleanupDesktopIni must be exported');

  const repoRoot = makeTempDir();
  const metadataDir = path.join(repoRoot, '.git');
  const worktreeDesktopIni = path.join(repoRoot, 'nested', 'desktop.ini');
  const gitDesktopIni = path.join(metadataDir, 'refs', 'desktop.ini');
  const keepFile = path.join(repoRoot, 'nested', 'keep.txt');

  fs.mkdirSync(path.dirname(worktreeDesktopIni), { recursive: true });
  fs.mkdirSync(path.dirname(gitDesktopIni), { recursive: true });
  fs.writeFileSync(worktreeDesktopIni, 'trash');
  fs.writeFileSync(gitDesktopIni, 'trash');
  fs.writeFileSync(keepFile, 'keep');

  const result = cleanupDesktopIni({
    repoRoot,
    write: true,
    execFileSyncImpl() {
      return Buffer.from('');
    },
  });

  assert.equal(result.deletedPaths.length, 2, 'expected both desktop.ini files to be deleted');
  assert.equal(fs.existsSync(worktreeDesktopIni), false, 'work tree desktop.ini should be deleted');
  assert.equal(fs.existsSync(gitDesktopIni), false, 'git metadata desktop.ini should be deleted');
  assert.equal(fs.existsSync(keepFile), true, 'non-target files must remain');
});

test('resolves git metadata from a .git file and deletes nested desktop.ini files there', async () => {
  const { cleanupDesktopIni, resolveGitMetadataDirectory } = await loadCleanupModule();
  assert.equal(typeof cleanupDesktopIni, 'function', 'cleanupDesktopIni must be exported');
  assert.equal(typeof resolveGitMetadataDirectory, 'function', 'resolveGitMetadataDirectory must be exported');

  const repoRoot = makeTempDir();
  const metadataDir = path.join(repoRoot, '.git-data', 'worktrees', 'example');
  const metadataDesktopIni = path.join(metadataDir, 'logs', 'desktop.ini');

  fs.mkdirSync(path.dirname(metadataDesktopIni), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, '.git'), 'gitdir: .git-data/worktrees/example\n');
  fs.writeFileSync(metadataDesktopIni, 'trash');

  assert.equal(resolveGitMetadataDirectory(repoRoot), metadataDir);

  const result = cleanupDesktopIni({
    repoRoot,
    write: true,
    execFileSyncImpl() {
      return Buffer.from('');
    },
  });

  assert.equal(result.deletedPaths.length, 1, 'expected the metadata desktop.ini to be deleted');
  assert.equal(fs.existsSync(metadataDesktopIni), false, 'resolved metadata desktop.ini should be deleted');
});

test('dry-run reports desktop.ini files without deleting them', async () => {
  const { cleanupDesktopIni } = await loadCleanupModule();
  assert.equal(typeof cleanupDesktopIni, 'function', 'cleanupDesktopIni must be exported');

  const repoRoot = makeTempDir();
  const worktreeDesktopIni = path.join(repoRoot, 'desktop.ini');

  fs.writeFileSync(worktreeDesktopIni, 'trash');

  const result = cleanupDesktopIni({ repoRoot, write: false });

  assert.deepEqual(result.deletedPaths, []);
  assert.deepEqual(result.foundPaths, [worktreeDesktopIni]);
  assert.equal(fs.existsSync(worktreeDesktopIni), true, 'dry-run must not delete files');
});

test('staged cleanup limits worktree scanning to staged ancestors while still sweeping git metadata', async () => {
  const { cleanupDesktopIni } = await loadCleanupModule();
  assert.equal(typeof cleanupDesktopIni, 'function', 'cleanupDesktopIni must be exported');

  const repoRoot = makeTempDir();
  const metadataDesktopIni = path.join(repoRoot, '.git', 'logs', 'desktop.ini');
  const targetedDesktopIni = path.join(repoRoot, 'tracked', 'desktop.ini');
  const unrelatedDesktopIni = path.join(repoRoot, 'unrelated', 'deep', 'desktop.ini');
  const stagedFile = path.join(repoRoot, 'tracked', 'nested', 'file.txt');

  fs.mkdirSync(path.dirname(metadataDesktopIni), { recursive: true });
  fs.mkdirSync(path.dirname(targetedDesktopIni), { recursive: true });
  fs.mkdirSync(path.dirname(unrelatedDesktopIni), { recursive: true });
  fs.mkdirSync(path.dirname(stagedFile), { recursive: true });
  fs.writeFileSync(metadataDesktopIni, 'trash');
  fs.writeFileSync(targetedDesktopIni, 'trash');
  fs.writeFileSync(unrelatedDesktopIni, 'trash');
  fs.writeFileSync(stagedFile, 'keep');

  const result = cleanupDesktopIni({
    repoRoot,
    write: true,
    scope: 'staged',
    stagedFiles: ['tracked/nested/file.txt'],
    execFileSyncImpl() {
      return Buffer.from('');
    },
  });

  assert.equal(result.scanMode, 'staged');
  assert.equal(fs.existsSync(targetedDesktopIni), false, 'staged cleanup should remove nearby desktop.ini files');
  assert.equal(fs.existsSync(metadataDesktopIni), false, 'staged cleanup should still sweep git metadata');
  assert.equal(fs.existsSync(unrelatedDesktopIni), true, 'staged cleanup should not recurse unrelated worktree paths');
});

test('staged cleanup removes desktop.ini from the git index when it was staged', async () => {
  const { cleanupDesktopIni } = await loadCleanupModule();
  assert.equal(typeof cleanupDesktopIni, 'function', 'cleanupDesktopIni must be exported');

  const repoRoot = makeTempDir();
  execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });

  const stagedDesktopIni = path.join(repoRoot, 'desktop.ini');
  const keepFile = path.join(repoRoot, 'keep.txt');
  fs.writeFileSync(stagedDesktopIni, 'trash');
  fs.writeFileSync(keepFile, 'keep');

  execFileSync('git', ['add', 'desktop.ini', 'keep.txt'], { cwd: repoRoot, stdio: 'ignore' });

  const result = cleanupDesktopIni({ repoRoot, write: true, scope: 'staged' });
  const cachedPaths = execFileSync('git', ['diff', '--cached', '--name-only'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  assert.equal(result.scanMode, 'staged');
  assert.equal(fs.existsSync(stagedDesktopIni), false, 'staged desktop.ini should be deleted from disk');
  assert.deepEqual(cachedPaths, ['keep.txt'], 'staged desktop.ini should be removed from the index');
});

test('cli --check exits nonzero when desktop.ini files are present', () => {
  const repoRoot = makeTempDir();
  fs.writeFileSync(path.join(repoRoot, 'desktop.ini'), 'trash');

  const result = spawnSync(process.execPath, [scriptEntry, '--check'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0, 'expected --check to fail when desktop.ini files are present');
  assert.match(result.stdout, /desktop\.ini/i);
});

test('cli rejects unknown flags', () => {
  const repoRoot = makeTempDir();

  const result = spawnSync(process.execPath, [scriptEntry, '--bogus'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0, 'expected unknown flags to fail fast');
  assert.match(result.stderr, /unknown argument/i);
});
