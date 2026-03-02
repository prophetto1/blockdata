import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const webDir = process.cwd();
const docsDir = resolve(webDir, '../web-docs');
const docsPackageJson = resolve(docsDir, 'package.json');
const docsDistDir = resolve(docsDir, 'dist');
const targetDir = resolve(webDir, 'dist', 'docs');
const docsPackageLock = resolve(docsDir, 'package-lock.json');
const docsNpmShrinkwrap = resolve(docsDir, 'npm-shrinkwrap.json');

if (!existsSync(docsDir) || !existsSync(docsPackageJson)) {
  console.log('[build] Skipping docs-site build: ../web-docs/package.json not found.');
  process.exit(0);
}

console.log('[build] Building docs-site...');
try {
  const docsInstallCommand = existsSync(docsPackageLock) || existsSync(docsNpmShrinkwrap)
    ? 'npm ci'
    : 'npm install';
  execSync(docsInstallCommand, { cwd: docsDir, stdio: 'inherit', shell: true });
  execSync('npm run build', { cwd: docsDir, stdio: 'inherit', shell: true });

  if (!existsSync(docsDistDir)) {
    console.warn('[build] docs-site build completed but dist directory is missing — skipping copy.');
    process.exit(0);
  }

  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  cpSync(docsDistDir, targetDir, { recursive: true, force: true });

  console.log('[build] Copied docs-site dist output into web/dist/docs');
} catch (err) {
  console.warn(`[build] docs-site build failed (non-fatal): ${err.message}`);
}
