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

const splitEditorView = readFileSync(
  new URL('../src/components/SplitEditorView.tsx', import.meta.url),
  'utf8',
);
const editorTabStrip = readFileSync(
  new URL('../src/components/EditorTabStrip.tsx', import.meta.url),
  'utf8',
);
const workbenchSplitter = readFileSync(
  new URL('../src/components/WorkbenchSplitter.tsx', import.meta.url),
  'utf8',
);
const shellState = readFileSync(
  new URL('../src/lib/docs/shell-state.ts', import.meta.url),
  'utf8',
);

run('split editor owns the default mode and drives a selector-based mode strip', () => {
  assert.match(shellState, /export const DEFAULT_EDITOR_MODE: EditorMode = 'rich';/);
  assert.match(editorTabStrip, /@ark-ui\/react\/select/);
  assert.match(editorTabStrip, /createListCollection/);
  assert.match(editorTabStrip, /mode = DEFAULT_EDITOR_MODE/);
  assert.doesNotMatch(editorTabStrip, /useState<EditorMode>/);
  assert.doesNotMatch(splitEditorView, /import type \{ EditorMode \} from '\.\/EditorTabStrip';/);
  assert.match(splitEditorView, /DEFAULT_EDITOR_MODE/);
  assert.match(splitEditorView, /useState<EditorMode>\(DEFAULT_EDITOR_MODE\)/);
  assert.match(splitEditorView, /<EditorTabStrip mode=\{mode\} onModeChange=\{handleModeChange\} \/>/);
  assert.doesNotMatch(workbenchSplitter, /<EditorTabStrip/);
});
