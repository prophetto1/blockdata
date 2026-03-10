import { normalizePath } from '@/lib/filesTree';

const VIRTUAL_FOLDERS_STORAGE_KEY_PREFIX = 'blockdata.elt.virtual_folders.';

export function readStoredVirtualFolders(projectId: string | null): string[] {
  if (typeof window === 'undefined' || !projectId) return [];
  try {
    const raw = window.localStorage.getItem(`${VIRTUAL_FOLDERS_STORAGE_KEY_PREFIX}${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === 'string' ? normalizePath(item) : ''))
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

export function writeStoredVirtualFolders(projectId: string | null, folders: string[]) {
  if (typeof window === 'undefined' || !projectId) return;
  const normalized = folders
    .map((folder) => normalizePath(folder))
    .filter((folder, index, input) => folder.length > 0 && input.indexOf(folder) === index);
  window.localStorage.setItem(
    `${VIRTUAL_FOLDERS_STORAGE_KEY_PREFIX}${projectId}`,
    JSON.stringify(normalized),
  );
}
