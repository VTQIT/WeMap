const DB_NAME = 'wemap_tiles';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      e.target.result.createObjectStore('tiles');
    };
    request.onsuccess = (e: any) => {
      db = e.target.result;
      resolve(db!);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function dbGet(key: string): Promise<string | null> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction('tiles', 'readonly');
    const req = tx.objectStore('tiles').get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function dbSet(key: string, val: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('tiles', 'readwrite');
    tx.objectStore('tiles').put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbCount(): Promise<number> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction('tiles', 'readonly');
    const req = tx.objectStore('tiles').count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
}

export async function dbClear(): Promise<void> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction('tiles', 'readwrite');
    tx.objectStore('tiles').clear();
    tx.oncomplete = () => resolve();
  });
}

export async function dbGetTotalSize(): Promise<number> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction('tiles', 'readonly');
    const store = tx.objectStore('tiles');
    const req = store.openCursor();
    let totalSize = 0;
    req.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) {
        // Approximate size of the value (data URL string)
        totalSize += cursor.value.length;
        cursor.continue();
      } else {
        resolve(totalSize);
      }
    };
    req.onerror = () => resolve(0);
  });
}

export async function dbDelete(key: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('tiles', 'readwrite');
    const req = tx.objectStore('tiles').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
