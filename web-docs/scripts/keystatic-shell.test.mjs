import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

function run(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`PASS ${name}`);
    })
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

await run('keystatic route imports global and shell styles and mounts the shell app', async () => {
  const routePath = new URL('../src/pages/keystatic/index.astro', import.meta.url);

  assert.equal(existsSync(routePath), true);

  const routeSource = readFileSync(routePath, 'utf8');
  assert.match(routeSource, /import ['"]\.\.\/\.\.\/styles\/global\.css['"]/);
  assert.match(routeSource, /import ['"]\.\.\/\.\.\/styles\/keystatic-shell\.css['"]/);
  assert.match(routeSource, /KeystaticAppShell/);
  assert.match(routeSource, /<KeystaticAppShell client:load \/>/);
});

await run('keystatic shell stylesheet defines a narrow rail and open content area', async () => {
  const stylesheetPath = new URL('../src/styles/keystatic-shell.css', import.meta.url);

  assert.equal(existsSync(stylesheetPath), true);

  const stylesheetSource = readFileSync(stylesheetPath, 'utf8');
  assert.match(stylesheetSource, /\.bdks-shell\s*\{/);
  assert.match(stylesheetSource, /grid-template-columns:\s*13\.75rem minmax\(0, 1fr\)/);
  assert.match(stylesheetSource, /\.bdks-rail/);
  assert.match(stylesheetSource, /\.bdks-topbar/);
  assert.match(stylesheetSource, /\.bdks-launch-surface/);
  assert.doesNotMatch(stylesheetSource, /\.bdks-content-shell/);
});

await run('keystatic app shell renders the product-style shell markers', async () => {
  const shellPath = new URL('../src/components/keystatic/KeystaticAppShell.tsx', import.meta.url);

  assert.equal(existsSync(shellPath), true);

  const shellSource = readFileSync(shellPath, 'utf8');
  assert.match(shellSource, /className="bdks-shell"/);
  assert.match(shellSource, /className="bdks-rail"/);
  assert.match(shellSource, /className="bdks-topbar"/);
  assert.match(shellSource, /className="bdks-search-input"/);
  assert.match(shellSource, /Start your first flow execution/);
  assert.match(shellSource, /ThemeChoice/);
  assert.match(shellSource, /window\.localStorage\.setItem\('starlight-theme'/);
  assert.doesNotMatch(shellSource, /bdks-rail-icon/);
  assert.doesNotMatch(shellSource, /bdks-workspace-row/);
  assert.doesNotMatch(shellSource, /bdks-account-avatar/);
  assert.doesNotMatch(shellSource, /bdks-account-caret/);
});

await run('keystatic rail stylesheet leaves only the separator line chrome', async () => {
  const stylesheetPath = new URL('../src/styles/keystatic-shell.css', import.meta.url);

  assert.equal(existsSync(stylesheetPath), true);

  const stylesheetSource = readFileSync(stylesheetPath, 'utf8');
  assert.match(stylesheetSource, /border-right:\s*1px solid var\(--border\)/);
  assert.doesNotMatch(stylesheetSource, /\.bdks-rail-icon/);
  assert.doesNotMatch(stylesheetSource, /\.bdks-workspace-row/);
  assert.doesNotMatch(stylesheetSource, /\.bdks-account-avatar/);
  assert.doesNotMatch(stylesheetSource, /\.bdks-account-caret/);
});
