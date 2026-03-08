/**
 * Shared state helpers for the docs shell.
 *
 * - data-shell-mode on <html> is the single shell-mode source of truth.
 * - File selection is communicated through window events.
 */

export type ShellMode = 'sections' | 'filetree';
export type ShellFileSourceKind = 'repo' | 'local';
export type EditorMode = 'source' | 'rich';

export type ShellFileInfo = {
  filePath: string;
  extension: string;
  sourceKind: ShellFileSourceKind;
  docsHref?: string;
  localHandleId?: string;
};

export type ShellFileResetEvent = {
  reason?: 'mode-change' | 'folder-cleared' | 'file-missing';
};

export const SHELL_MODE_ATTR = 'data-shell-mode';
export const SHELL_MODE_STORAGE_KEY = 'shell-mode';
export const FILE_STORAGE_KEY = 'shell-selected-file';
export const SPLIT_RATIO_STORAGE_KEY = 'shell-split-ratio';
export const SHELL_FILE_EVENT = 'shell-file-select';
export const SHELL_FILE_RESET_EVENT = 'shell-file-reset';
export const SHELL_EDITOR_MODE_EVENT = 'shell-editor-mode';
export const SHELL_PREVIEW_REFRESH_EVENT = 'shell-preview-refresh';
export const DEFAULT_EDITOR_MODE: EditorMode = 'rich';

export function selectFile(file: ShellFileInfo): void {
  window.dispatchEvent(new CustomEvent(SHELL_FILE_EVENT, { detail: file }));
}

export function resetSelectedFile(detail?: ShellFileResetEvent): void {
  window.dispatchEvent(new CustomEvent(SHELL_FILE_RESET_EVENT, { detail }));
}

export function onFileSelect(callback: (file: ShellFileInfo) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as ShellFileInfo | undefined;
    if (detail?.filePath) callback(detail);
  };
  window.addEventListener(SHELL_FILE_EVENT, handler);
  return () => window.removeEventListener(SHELL_FILE_EVENT, handler);
}

export function onFileReset(callback: (detail?: ShellFileResetEvent) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as ShellFileResetEvent | undefined;
    callback(detail);
  };
  window.addEventListener(SHELL_FILE_RESET_EVENT, handler);
  return () => window.removeEventListener(SHELL_FILE_RESET_EVENT, handler);
}

