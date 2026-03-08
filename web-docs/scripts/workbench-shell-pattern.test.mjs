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
const splitEditorView = readFileSync(new URL('../src/components/SplitEditorView.tsx', import.meta.url), 'utf8');
const workbenchSplitter = readFileSync(new URL('../src/components/WorkbenchSplitter.tsx', import.meta.url), 'utf8');
const docsTwoColumn = readFileSync(new URL('../src/components/DocsTwoColumnContent.astro', import.meta.url), 'utf8');
const workbenchShellCss = readFileSync(new URL('../src/styles/workbench-shell.css', import.meta.url), 'utf8');
const splitEditorCss = readFileSync(new URL('../src/styles/split-editor.css', import.meta.url), 'utf8');

run('workbench shell owns the shared editor surface pattern while docs pages remain the preview surface', () => {
  assert.match(globalCss, /@import '\.\/workbench-shell\.css';/);
  assert.match(workbenchShellCss, /\.workbench-surface\s*\{/);
  assert.match(workbenchShellCss, /\.workbench-surface__canvas\s*\{/);
  assert.match(workbenchShellCss, /--workbench-document-inset/);
  assert.match(workbenchShellCss, /\.workbench-document\s*\{/);
  assert.match(workbenchShellCss, /\.workbench-prose\s*\{/);

  assert.match(splitEditorView, /EditorSurface variant="monaco"/);
  assert.match(splitEditorView, /EditorSurface variant="mdx" prose/);
  assert.match(splitEditorView, /workbench-surface__canvas/);
  assert.match(splitEditorView, /createPortal/);
  assert.match(splitEditorView, /toolbarHost/);
  assert.doesNotMatch(workbenchSplitter, /workbench-surface--preview/);
  assert.doesNotMatch(workbenchSplitter, /data-shell="splitter-preview"/);
  assert.match(docsTwoColumn, /class="wa-preview"/);
  assert.doesNotMatch(docsTwoColumn, /split-editor__local-preview/);
  assert.match(splitEditorCss, /--workbench-editor-document-padding/);
  assert.match(splitEditorCss, /mdxeditor-root-contenteditable/);
  assert.match(splitEditorCss, /\.split-editor__mdx :where\(\.mdxeditor-root-contenteditable\)\s*\{[\s\S]*padding: var\(--workbench-editor-document-padding\);/);
});
