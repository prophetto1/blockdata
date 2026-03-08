import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('package.json restores Keystatic dependencies', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const dependencies = packageJson.dependencies ?? {};

  assert.equal(dependencies['@keystatic/astro'], '^5.0.6');
  assert.equal(dependencies['@keystatic/core'], '^0.5.48');
});

run('astro config mounts the Keystatic integration', () => {
  const astroConfig = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');

  assert.match(astroConfig, /import keystatic from '@keystatic\/astro';/);
  assert.match(astroConfig, /integrations:\s*\[[\s\S]*keystatic\(\)/);
});

run('keystatic config exists for the standalone admin page', () => {
  const configPath = new URL('../keystatic.config.ts', import.meta.url);

  assert.equal(existsSync(configPath), true);

  const source = readFileSync(configPath, 'utf8');
  assert.match(source, /export default config\(/);
  assert.match(source, /storage:\s*\{\s*kind:\s*'local'/);
});
