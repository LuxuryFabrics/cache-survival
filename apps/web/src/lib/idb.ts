import { openDB, type IDBPDatabase } from "idb";

const DB = "cache-survival";
const VERSION = 2;

export type CacheDB = IDBPDatabase<{
  kv: { key: string; value: unknown };
  blobs: { key: string; value: ArrayBuffer | Blob };
  tiles: { key: string; value: ArrayBuffer };
}>;

let dbPromise: Promise<CacheDB> | null = null;

export function db(): Promise<CacheDB> {
  if (!dbPromise) {
    dbPromise = openDB(DB, VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
        if (!database.objectStoreNames.contains("blobs")) database.createObjectStore("blobs");
        if (!database.objectStoreNames.contains("tiles")) database.createObjectStore("tiles");
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

function asArrayBuffer(value: ArrayBuffer | ArrayBufferView | Blob): Promise<ArrayBuffer> | ArrayBuffer {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
  }
  return value.arrayBuffer();
}

/** Read raw bytes. Blobs are accepted so a download saved by an older build still resumes. */
export async function bytesGet(id: string): Promise<ArrayBuffer | undefined> {
  const value = (await (await db()).get("blobs", id)) as ArrayBuffer | ArrayBufferView | Blob | undefined;
  if (!value) return undefined;
  return asArrayBuffer(value);
}

/** Persist bytes, not a Blob. WebKit rejects Blob/File values in this store. */
export async function bytesSet(id: string, data: ArrayBuffer): Promise<void> {
  await (await db()).put("blobs", data, id);
}

export async function blobGet(id: string): Promise<Blob | undefined> {
  const value = (await (await db()).get("blobs", id)) as ArrayBuffer | ArrayBufferView | Blob | undefined;
  if (!value) return undefined;
  if (value instanceof Blob) return value;
  const bytes = await asArrayBuffer(value);
  return new Blob([bytes]);
}

export async function blobSet(id: string, blob: Blob): Promise<void> {
  await bytesSet(id, await blob.arrayBuffer());
}

export async function blobDel(id: string): Promise<void> {
  await (await db()).delete("blobs", id);
}

export async function blobSize(id: string): Promise<number> {
  const b = await blobGet(id);
  return b?.size ?? 0;
}

export async function tileGet(key: string): Promise<ArrayBuffer | undefined> {
  return (await db()).get("tiles", key) as Promise<ArrayBuffer | undefined>;
}

export async function tileSet(key: string, data: ArrayBuffer): Promise<void> {
  const database = await db();
  const existing = (await database.get("tiles", key)) as ArrayBuffer | undefined;
  await database.put("tiles", data, key);
  const stats = (await kvGet<{ count: number; bytes: number }>("tiles:stats")) ?? { count: 0, bytes: 0 };
  if (existing) stats.bytes += data.byteLength - existing.byteLength;
  else {
    stats.count += 1;
    stats.bytes += data.byteLength;
  }
  await kvSet("tiles:stats", stats);
}

export async function tileStats(): Promise<{ count: number; bytes: number }> {
  return (await kvGet<{ count: number; bytes: number }>("tiles:stats")) ?? { count: 0, bytes: 0 };
}

export async function estimateUsageMb(): Promise<{ usedMb: number; quotaMb: number }> {
  const est = await navigator.storage?.estimate?.();
  return {
    usedMb: (est?.usage ?? 0) / (1024 * 1024),
    quotaMb: (est?.quota ?? 0) / (1024 * 1024),
  };
}
