import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

function run(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => console.log(`PASS ${name}`),
        (error) => {
          console.error(`FAIL ${name}`);
          throw error;
        }
      );
    }
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('package.json keeps Keystatic platform dependencies installed', () => {
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

run('docs header exposes a visible shortcut to the Keystatic editor', () => {
  const docsHeader = readFileSync(new URL('../src/components/DocsHeader.astro', import.meta.url), 'utf8');

  assert.match(docsHeader, /href="\/keystatic"/);
  assert.match(docsHeader, />Editor</);
  assert.doesNotMatch(docsHeader, /\.social-icons::after/);
});

run('docs header uses the Hugeicons theme toggle instead of the Starlight theme dropdown', () => {
  const docsHeader = readFileSync(new URL('../src/components/DocsHeader.astro', import.meta.url), 'utf8');
  const togglePath = new URL('../src/components/ThemeToggle.astro', import.meta.url);

  assert.doesNotMatch(docsHeader, /ThemeSelect/);
  assert.match(docsHeader, /import ThemeToggle from '\.\/ThemeToggle\.astro';/);
  assert.match(docsHeader, /<ThemeToggle \/>/);
  assert.doesNotMatch(docsHeader, /client:load/);
  assert.equal(existsSync(togglePath), true);

  const toggleSource = readFileSync(togglePath, 'utf8');
  assert.match(toggleSource, /Moon02Icon/);
  assert.match(toggleSource, /Sun03Icon/);
  assert.match(toggleSource, /starlight-theme/);
  assert.match(toggleSource, /theme-toggle-icon--light/);
  assert.match(toggleSource, /theme-toggle-icon--dark/);
  assert.doesNotMatch(toggleSource, /useState/);
  assert.match(toggleSource, /document\.documentElement\.dataset\.theme/);
});

await run('docs sidebar offers a persistent nav and file-tree view toggle', () => {
  const docsSidebar = readFileSync(new URL('../src/components/DocsSidebar.astro', import.meta.url), 'utf8');
  const docsSidebarTree = readFileSync(
    new URL('../src/components/DocsSidebarFileTree.tsx', import.meta.url),
    'utf8'
  );

  assert.match(docsSidebar, /DocsSidebarFileTree/);
  assert.match(docsSidebar, /SidebarPersister/);
  assert.match(docsSidebar, /data-sidebar-view-root/);
  assert.match(docsSidebar, /data-sidebar-view-button/);
  assert.match(docsSidebar, /localStorage\.getItem\('starlight-sidebar-view'\)/);
  assert.match(docsSidebar, /data-sidebar-panel="files"/);
  assert.match(docsSidebar, /<DocsSidebarFileTree[\s\S]*client:load/);
  assert.match(docsSidebar, /data-sidebar-view='files'\] \[data-sidebar-panel='nav'\]/);
  assert.match(docsSidebar, /data-sidebar-view='nav'\] \[data-sidebar-panel='files'\]/);
  assert.doesNotMatch(docsSidebar, /panel\.hidden =/);

  assert.match(docsSidebarTree, /@ark-ui\/react\/tree-view/);
  assert.match(docsSidebarTree, /createTreeCollection/);
  assert.match(docsSidebarTree, /defaultExpandedValue/);
  assert.match(docsSidebarTree, /defaultSelectedValue/);
  assert.match(docsSidebarTree, /TreeView\.BranchTrigger/);
  assert.match(docsSidebarTree, /TreeView\.Item/);
});

run('docs sidebar uses higher-visibility explorer icons', () => {
  const docsSidebar = readFileSync(new URL('../src/components/DocsSidebar.astro', import.meta.url), 'utf8');
  const docsSidebarTree = readFileSync(
    new URL('../src/components/DocsSidebarFileTree.tsx', import.meta.url),
    'utf8'
  );

  assert.match(docsSidebar, /from 'lucide-react'/);
  assert.match(docsSidebar, /PanelLeft/);
  assert.match(docsSidebar, /FolderTree/);
  assert.doesNotMatch(docsSidebar, /FolderUp/);
  assert.doesNotMatch(docsSidebar, /docs-folder-picker/);
  assert.doesNotMatch(docsSidebar, /docs-select-folder/);

  assert.match(docsSidebarTree, /FolderClosed/);
  assert.match(docsSidebarTree, /FolderOpen/);
  assert.match(docsSidebarTree, /FileCode2/);
  assert.match(docsSidebarTree, /FileText/);
  assert.match(docsSidebarTree, /const ICON_SIZE = 16/);
  assert.match(docsSidebarTree, /const ICON_STROKE = 2\.25/);
  assert.match(docsSidebarTree, /docs-tree-icon--folder-closed/);
  assert.match(docsSidebarTree, /docs-tree-icon--folder-open/);
  assert.match(docsSidebarTree, /docs-tree-icon--markdown/);
  assert.match(docsSidebar, /docs-tree-icon--folder-open/);
  assert.match(docsSidebar, /data-state='open'.*docs-tree-icon--folder-closed/s);
});

run('docs file tree uses the bumped item font size', () => {
  const docsSidebar = readFileSync(new URL('../src/components/DocsSidebar.astro', import.meta.url), 'utf8');

  assert.match(docsSidebar, /:global\(\.docs-tree\)\s*\{[\s\S]*font-size:\s*0\.78rem;/);
});

run('docs file tree treats empty directories as folders, not files', () => {
  const docsSidebarTree = readFileSync(
    new URL('../src/components/DocsSidebarFileTree.tsx', import.meta.url),
    'utf8'
  );

  assert.match(docsSidebarTree, /function isDirectoryNode\(node: DocsSidebarTreeNode\)/);
  assert.match(docsSidebarTree, /isDirectoryNode\(node\) \?/);
  assert.doesNotMatch(docsSidebarTree, /node\.children\?\.length \?/);
});

run('docs filetree repo preview stays inside the shell instead of full-page navigation', () => {
  const contentShell = readFileSync(
    new URL('../src/components/DocsTwoColumnContent.astro', import.meta.url),
    'utf8'
  );
  const splitter = readFileSync(
    new URL('../src/components/WorkbenchSplitter.tsx', import.meta.url),
    'utf8'
  );

  assert.match(contentShell, /function loadRepoPreviewIntoShell\(url\)/);
  assert.match(contentShell, /history\.replaceState\(/);
  assert.match(contentShell, /fetch\(url\.toString\(\),/);
  assert.match(contentShell, /DOMParser/);
  assert.match(contentShell, /loadRepoPreviewIntoShell\(next\)/);
  assert.match(splitter, /data-shell="splitter-preview"/);
});

await run('docs sidebar and Keystatic home share the same docs content tree source', async () => {
  const contentTreePath = new URL('../src/lib/docs/content-tree.mjs', import.meta.url);
  assert.equal(existsSync(contentTreePath), true);

  const contentTree = await import(contentTreePath);
  const { getDocsContentTreeState } = contentTree;
  assert.equal(typeof getDocsContentTreeState, 'function');

  const { treeRoot } = getDocsContentTreeState();
  assert.equal(treeRoot.name, 'docs');

  const homeNode = treeRoot.children.find((node) => node.relativePath === 'index.mdx');
  assert.deepEqual(
    {
      docsHref: homeNode?.docsHref,
      editorHref: homeNode?.editorHref,
    },
    {
      docsHref: '/',
      editorHref: '/keystatic/singleton/siteHome',
    }
  );

  const nestedDocsNode = treeRoot.children
    .find((node) => node.relativePath === 'internal')
    ?.children.find((node) => node.relativePath === 'internal/local-urls.md');
  assert.deepEqual(
    {
      docsHref: nestedDocsNode?.docsHref,
      editorHref: nestedDocsNode?.editorHref,
    },
    {
      docsHref: '/internal/local-urls/',
      editorHref: '/keystatic/collection/internalDocs/item/local-urls',
    }
  );

  const keystaticHome = readFileSync(new URL('../src/lib/keystatic/home-tree.mjs', import.meta.url), 'utf8');
  assert.match(keystaticHome, /from '\.\.\/docs\/content-tree\.mjs'/);
  assert.match(keystaticHome, /getDocsContentTreeState/);
});
