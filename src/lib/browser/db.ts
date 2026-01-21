// IndexedDB wrapper for Turbo DCA persistence
// Handles database initialization, schema upgrades, and basic CRUD operations

export const DB_NAME = 'turbo-dca-db';
export const DB_VERSION = 1;

// Store names
export const STORES = {
  PROJECTS: 'projects',
  ANALYSES: 'analyses',
  ISSUES: 'issues',
} as const;

// Singleton database instance
let dbInstance: IDBDatabase | null = null;

/**
 * Open or create the IndexedDB database
 * Creates object stores and indexes on first run or version upgrade
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Projects store
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        projectStore.createIndex('name', 'name', { unique: false });
        projectStore.createIndex('lastAnalyzedAt', 'lastAnalyzedAt', { unique: false });
      }

      // Analyses store
      if (!db.objectStoreNames.contains(STORES.ANALYSES)) {
        const analysisStore = db.createObjectStore(STORES.ANALYSES, { keyPath: 'id' });
        analysisStore.createIndex('projectId', 'projectId', { unique: false });
        analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
        // Compound index for project + time queries
        analysisStore.createIndex('projectId_timestamp', ['projectId', 'timestamp'], { unique: false });
      }

      // Issues store
      if (!db.objectStoreNames.contains(STORES.ISSUES)) {
        const issueStore = db.createObjectStore(STORES.ISSUES, { keyPath: 'id' });
        issueStore.createIndex('analysisId', 'analysisId', { unique: false });
        issueStore.createIndex('projectId', 'projectId', { unique: false });
        issueStore.createIndex('fingerprint', 'fingerprint', { unique: false });
        issueStore.createIndex('status', 'status', { unique: false });
        // Compound index for project + fingerprint (deduplication)
        issueStore.createIndex('projectId_fingerprint', ['projectId', 'fingerprint'], { unique: false });
      }
    };
  });
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Generic get operation
 */
export async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as T | undefined);
  });
}

/**
 * Generic put operation (insert or update)
 */
export async function put<T>(storeName: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Generic delete operation
 */
export async function remove(storeName: string, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all records from a store
 */
export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as T[]);
  });
}

/**
 * Get records by index value
 */
export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as T[]);
  });
}

/**
 * Get records by index with a limit, sorted by another index
 */
export async function getByIndexWithLimit<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey,
  limit: number,
  direction: IDBCursorDirection = 'prev' // 'prev' = newest first
): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const results: T[] = [];

    const request = index.openCursor(IDBKeyRange.only(value), direction);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value as T);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

/**
 * Delete all records matching an index value
 */
export async function deleteByIndex(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    let deleteCount = 0;

    const request = index.openCursor(IDBKeyRange.only(value));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        deleteCount++;
        cursor.continue();
      } else {
        resolve(deleteCount);
      }
    };
  });
}

/**
 * Count records in a store
 */
export async function count(storeName: string): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Count records by index value
 */
export async function countByIndex(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.count(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear the entire database
 */
export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  const storeNames = Array.from(db.objectStoreNames);

  for (const storeName of storeNames) {
    await clearStore(storeName);
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
