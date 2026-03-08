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

const globalCss = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const workbenchShellCss = readFileSync(new URL('../src/styles/workbench-shell.css', import.meta.url), 'utf8');

run('global shell restores thin scrollbars, sidebar clipping, and refined inline code', () => {
  assert.match(globalCss, /\.sidebar-pane\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(globalCss, /scrollbar-width:\s*thin;/);
  assert.match(globalCss, /::\-webkit-scrollbar/);
  assert.match(globalCss, /padding:\s*0\.02rem 0\.18rem;/);
  assert.match(globalCss, /border-radius:\s*0\.2rem;/);
  assert.match(workbenchShellCss, /padding:\s*0\.02rem 0\.18rem;/);
  assert.match(workbenchShellCss, /border-radius:\s*0\.2rem;/);
});
