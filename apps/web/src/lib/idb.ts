import { openDB, type IDBPDatabase } from "idb";

const DB = "cache-survival";
const VERSION = 1;

export type CacheDB = IDBPDatabase<{
  kv: { key: string; value: unknown };
  blobs: { key: string; value: Blob };
}>;

let dbPromise: Promise<CacheDB> | null = null;

export function db(): Promise<CacheDB> {
  if (!dbPromise) {
    dbPromise = openDB(DB, VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
        if (!database.objectStoreNames.contains("blobs")) database.createObjectStore("blobs");
      },
    }) as Promise<CacheDB>;
  }
  return dbPromise;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db()).get("kv", key) as Promise<T | undefined>;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await (await db()).put("kv", value, key);
}

export async function kvDel(key: string): Promise<void> {
  await (await db()).delete("kv", key);
}

export async function kvKeys(prefix?: string): Promise<string[]> {
  const keys = (await (await db()).getAllKeys("kv")) as string[];
  return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
}

export async function blobGet(id: string): Promise<Blob | undefined> {
  return (await db()).get("blobs", id) as Promise<Blob | undefined>;
}

export async function blobSet(id: string, blob: Blob): Promise<void> {
  await (await db()).put("blobs", blob, id);
}

export async function blobDel(id: string): Promise<void> {
  await (await db()).delete("blobs", id);
}

export async function blobSize(id: string): Promise<number> {
  const b = await blobGet(id);
  return b?.size ?? 0;
}

export async function estimateUsageMb(): Promise<{ usedMb: number; quotaMb: number }> {
  const est = await navigator.storage?.estimate?.();
  return {
    usedMb: (est?.usage ?? 0) / (1024 * 1024),
    quotaMb: (est?.quota ?? 0) / (1024 * 1024),
  };
}
