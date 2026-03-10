import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilesTreeNode = {
  id: string;
  label: string;
  kind: 'folder' | 'file';
  sourceUid?: string;
  doc?: ProjectDocumentRow;
  children?: FilesTreeNode[];
};

type MutableFolderNode = {
  id: string;
  label: string;
  folders: Map<string, MutableFolderNode>;
  files: FilesTreeNode[];
};

// ---------------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------------

export function normalizePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join('/');
}

export function joinPath(prefix: string, segment: string): string {
  const normalizedPrefix = normalizePath(prefix);
  const normalizedSegment = normalizePath(segment);
  if (!normalizedPrefix) return normalizedSegment;
  if (!normalizedSegment) return normalizedPrefix;
  return `${normalizedPrefix}/${normalizedSegment}`;
}

export function ensureFileExtension(path: string, fallbackExtension = '.txt'): string {
  const parts = normalizePath(path).split('/').filter((part) => part.length > 0);
  if (parts.length === 0) return '';
  const fileName = parts[parts.length - 1] ?? '';
  if (fileName.includes('.')) return parts.join('/');
  parts[parts.length - 1] = `${fileName}${fallbackExtension}`;
  return parts.join('/');
}

export function createDefaultTextFileContents(fileName: string): string {
  const timestamp = new Date().toISOString();
  return `# ${fileName}\n\nCreated ${timestamp}\n`;
}

export function getDocumentFolderPath(doc: ProjectDocumentRow | null | undefined): string {
  if (!doc) return '';
  const titleParts = normalizePath(doc.doc_title ?? '').split('/').filter((part) => part.length > 0);
  if (titleParts.length > 1) {
    return titleParts.slice(0, -1).join('/');
  }
  return '';
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

export function buildFilesTreeNodes(docs: ProjectDocumentRow[], extraFolders: string[] = []): FilesTreeNode[] {
  const root: MutableFolderNode = {
    id: 'root',
    label: '',
    folders: new Map<string, MutableFolderNode>(),
    files: [],
  };

  for (const doc of docs) {
    const titlePathParts = normalizePath(doc.doc_title ?? '').split('/').filter((part) => part.length > 0);
    const locatorPathParts = normalizePath(doc.source_locator ?? '').split('/').filter((part) => part.length > 0);
    const locatorName = locatorPathParts[locatorPathParts.length - 1] ?? doc.source_uid;
    const fallbackName = (doc.doc_title ?? '').trim() || locatorName || doc.source_uid;
    const displayPathParts = titlePathParts.length > 0 ? titlePathParts : [fallbackName];

    const folderParts = displayPathParts.length > 1 ? displayPathParts.slice(0, -1) : [];
    const fileLabel = displayPathParts[displayPathParts.length - 1] ?? fallbackName;

    let currentFolder = root;
    let folderPath = '';
    for (const part of folderParts) {
      folderPath = folderPath ? `${folderPath}/${part}` : part;
      let nextFolder = currentFolder.folders.get(part);
      if (!nextFolder) {
        nextFolder = {
          id: `folder:${folderPath}`,
          label: part,
          folders: new Map<string, MutableFolderNode>(),
          files: [],
        };
        currentFolder.folders.set(part, nextFolder);
      }
      currentFolder = nextFolder;
    }

    currentFolder.files.push({
      id: `doc:${doc.source_uid}`,
      label: fileLabel,
      kind: 'file',
      sourceUid: doc.source_uid,
      doc,
    });
  }

  for (const folderPath of extraFolders) {
    const parts = folderPath.split('/').filter((p) => p.length > 0);
    let current = root;
    let accumulated = '';
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      let next = current.folders.get(part);
      if (!next) {
        next = {
          id: `folder:${accumulated}`,
          label: part,
          folders: new Map<string, MutableFolderNode>(),
          files: [],
        };
        current.folders.set(part, next);
      }
      current = next;
    }
  }

  const sortByLabel = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true });

  const toNodes = (folder: MutableFolderNode): FilesTreeNode[] => {
    const folderNodes = Array.from(folder.folders.values())
      .sort(sortByLabel)
      .map((childFolder) => ({
        id: childFolder.id,
        label: childFolder.label,
        kind: 'folder' as const,
        children: toNodes(childFolder),
      }));
    // Keep file insertion order from docs input (already sorted newest-first).
    const fileNodes = folder.files.map((file) => ({ ...file }));
    return [...folderNodes, ...fileNodes];
  };

  return toNodes(root);
}

// ---------------------------------------------------------------------------
// Tree queries
// ---------------------------------------------------------------------------

export function collectFolderNodeIds(nodes: FilesTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (input: FilesTreeNode[]) => {
    for (const node of input) {
      if (node.kind !== 'folder') continue;
      ids.push(node.id);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

export function findFirstPreviewableSourceUid(node: FilesTreeNode | null | undefined): string | null {
  if (!node) return null;
  if (node.kind === 'file') return node.sourceUid ?? null;

  const children = node.children ?? [];
  for (const child of children) {
    if (child.kind !== 'file') continue;
    if (child.sourceUid) return child.sourceUid;
  }
  for (const child of children) {
    if (child.kind !== 'folder') continue;
    const nested = findFirstPreviewableSourceUid(child);
    if (nested) return nested;
  }
  return null;
}

export function findFilesTreeNodeById(nodes: FilesTreeNode[], id: string): FilesTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const nested = findFilesTreeNodeById(node.children, id);
      if (nested) return nested;
    }
  }
  return null;
}
