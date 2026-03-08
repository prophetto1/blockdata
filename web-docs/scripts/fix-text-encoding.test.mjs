import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

import { fixMojibakeText, isDirectExecution, withSafeDirectory } from './fix-text-encoding.mjs';

test('fixMojibakeText repairs common windows-1252 mojibake', () => {
  const input = 'platform â€” knowledge layer';
  const output = fixMojibakeText(input);

  assert.equal(output, 'platform — knowledge layer');
});

test('fixMojibakeText leaves normal ASCII text unchanged', () => {
  const input = 'plain ascii text';
  const output = fixMojibakeText(input);

  assert.equal(output, input);
});

test('isDirectExecution recognizes a direct node invocation path', () => {
  const scriptPath = 'F:\\blockdata-ct\\scripts\\fix-text-encoding.mjs';
  const scriptUrl = pathToFileURL(scriptPath).href;

  assert.equal(isDirectExecution(scriptPath, scriptUrl), true);
});

test('withSafeDirectory prefixes git commands with repo safety config', () => {
  const args = withSafeDirectory(['ls-files'], 'F:/blockdata-ct');

  assert.deepEqual(args, ['-c', 'safe.directory=F:/blockdata-ct', 'ls-files']);
});
