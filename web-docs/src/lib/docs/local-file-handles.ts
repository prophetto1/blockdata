const IDB_NAME = 'docs-filetree';
const IDB_STORE = 'handles';
const LOCAL_DIR_HANDLE_KEY = 'selectedDir';
export const LOCAL_FILE_HANDLE_PREFIX = 'local:file:';

export function getLocalHandleId(relativePath: string) {
  return `${LOCAL_FILE_HANDLE_PREFIX}${relativePath}`;
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function awaitTransactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, LOCAL_DIR_HANDLE_KEY);
    await awaitTransactionComplete(tx);
    db.close();
  } catch {
    // Ignore.
  }
}

export async function restoreDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(LOCAL_DIR_HANDLE_KEY);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      tx.onerror = () => db.close();
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearSavedDirectoryHandle() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(LOCAL_DIR_HANDLE_KEY);
    await awaitTransactionComplete(tx);
    db.close();
  } catch {
    // ignore
  }
}

export async function saveLocalFileHandle(id: string, handle: FileSystemFileHandle) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, id);
    await awaitTransactionComplete(tx);
    db.close();
  } catch {
    // ignore
  }
}

export async function getLocalFileHandle(id: string): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openIDB();
    return await new Promise<FileSystemFileHandle | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      tx.onerror = () => db.close();
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearLocalFileHandles() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.openKeyCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (typeof cursor.key === 'string' && cursor.key.startsWith(LOCAL_FILE_HANDLE_PREFIX)) {
        store.delete(cursor.key);
      }
      cursor.continue();
    };
    await awaitTransactionComplete(tx);
    db.close();
  } catch {
    // ignore
  }
}
