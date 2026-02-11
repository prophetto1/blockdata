import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const metaConfiguratorDir = path.join(repoRoot, 'ref-repos', 'meta-configurator', 'meta_configurator');
const distDir = path.join(metaConfiguratorDir, 'dist-embed');
const outDir = path.join(repoRoot, 'web', 'public', 'meta-configurator-embed');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function run(cmd, args, cwd) {
  const isWin = process.platform === 'win32';
  const result = isWin
    ? spawnSync(process.env.COMSPEC ?? 'cmd.exe', ['/d', '/s', '/c', [cmd, ...args].join(' ')], { cwd, stdio: 'inherit' })
    : spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('[meta-configurator-embed] Building...');
run(npmCmd, ['run', 'build:embed'], metaConfiguratorDir);

if (!fs.existsSync(distDir)) {
  throw new Error(`Expected dist output directory not found: ${distDir}`);
}

console.log(`[meta-configurator-embed] Copying to ${outDir}`);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
copyDir(distDir, outDir);

console.log('[meta-configurator-embed] Done.');
