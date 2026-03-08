import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const stylesheetSource = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

run('docs page title panel does not show a divider above article content', () => {
  assert.match(
    stylesheetSource,
    /main > \.content-panel:first-child \+ \.content-panel\s*\{[\s\S]*?border-top:\s*0;[\s\S]*?\}/,
  );
});
