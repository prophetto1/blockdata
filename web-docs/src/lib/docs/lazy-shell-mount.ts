import { SHELL_MODE_ATTR } from './shell-state';

type RepoTreeNode = {
  id: string;
  name: string;
  relativePath: string;
  docsHref?: string;
  extension?: string;
  children?: RepoTreeNode[];
};

function isFiletreeMode() {
  return document.documentElement.getAttribute(SHELL_MODE_ATTR) === 'filetree';
}

function mountOnceWhenFiletreeMode(
  selector: string,
  mount: (container: HTMLElement) => Promise<void>,
) {
  let mounted = false;

  const tryMount = async () => {
    if (mounted || !isFiletreeMode()) return;

    const container = document.querySelector<HTMLElement>(selector);
    if (!container || container.dataset.shellMounted === 'true') return;

    mounted = true;
    container.dataset.shellMounted = 'true';
    await mount(container);
  };

  void tryMount();

  const observer = new MutationObserver(() => {
    void tryMount();
    if (mounted) observer.disconnect();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [SHELL_MODE_ATTR],
  });
}

async function renderReactComponent<TProps>(
  container: HTMLElement,
  loadComponent: () => Promise<{ default: (props: TProps) => JSX.Element }>,
  props: TProps,
) {
  const [{ createElement }, { createRoot }, componentModule] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    loadComponent(),
  ]);

  const root = createRoot(container);
  root.render(createElement(componentModule.default, props));
}

export function mountWorkbenchWhenFiletreeMode(selector: string) {
  mountOnceWhenFiletreeMode(selector, async (container) => {
    await renderReactComponent(
      container,
      () => import('../../components/WorkbenchSplitter.tsx'),
      {},
    );
  });
}

function readDocsSidebarFileTreePayload(container: HTMLElement) {
  let nodes: RepoTreeNode[] = [];

  try {
    nodes = JSON.parse(container.dataset.treeNodes ?? '[]') as RepoTreeNode[];
  } catch {
    nodes = [];
  }

  return {
    nodes,
    currentRelativePath: container.dataset.currentRelativePath ?? '',
  };
}

export function mountDocsSidebarFileTreeWhenFiletreeMode(selector: string) {
  mountOnceWhenFiletreeMode(selector, async (container) => {
    const { nodes, currentRelativePath } = readDocsSidebarFileTreePayload(container);

    await renderReactComponent(
      container,
      () => import('../../components/DocsSidebarFileTree.tsx'),
      { nodes, currentRelativePath },
    );
  });
}
