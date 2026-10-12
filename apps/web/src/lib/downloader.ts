import type { DownloadAdapter } from "@cache/core";
import { blobDel, bytesGet, bytesSet, kvDel, kvGet, kvSet } from "./idb";

/**
 * Resumable model downloads.
 * WebKit throws "Error preparing Blob/File data to be stored in object store"
 * when a Blob is saved in IndexedDB, which is what broke model installs.
 * Pieces are appended to a private file and flushed every 1 MB. If that file
 * store is missing, the same pieces are kept as array buffers instead.
 */
const FLUSH_BYTES = 1024 * 1024;
const MODEL_DIR = "models";

type Manifest = { bytes: number; count: number };
type Buffer = { chunks: ArrayBuffer[]; bytes: number };
type FileManifest = { id: string; count: number; bytes: number };
type WriterResponse = { id: number; size?: number; error?: string };

const tails = new Map<string, Promise<void>>();
const buffers = new Map<string, Buffer>();
const partialBytes = new Map<string, number>();
let opfsRoot: FileSystemDirectoryHandle | null | undefined;
let writer: Worker | null = null;
let writerBroken = false;
let writerChain: Promise<void> = Promise.resolve();
let writerSeq = 0;

function metaKey(id: string): string {
  return `dlmeta:${id}`;
}
function partKey(id: string, index: number): string {
  return `part:${id}:${index}`;
}
function filePartsKey(filename: string): string {
  return `fileparts:${filename}`;
}
function partialName(id: string): string {
  return `partial-${id.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

function enqueue(id: string, job: () => Promise<void>): Promise<void> {
  const prev = tails.get(id) ?? Promise.resolve();
  const run = prev.then(job, job);
  tails.set(id, run.then(() => undefined, () => undefined));
  return run;
}

function concat(chunks: ArrayBuffer[]): ArrayBuffer {
  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

function fileWorker(): Worker | null {
  if (writerBroken) return null;
  if (writer) return writer;
  try {
    if (typeof Worker === "undefined") {
      writerBroken = true;
      return null;
    }
    writer = new Worker(new URL("./model-writer.worker.ts", import.meta.url), { type: "module" });
    writer.addEventListener("error", () => {
      writerBroken = true;
    });
    return writer;
  } catch {
    writerBroken = true;
    return null;
  }
}

function askWorker(op: "write" | "close", name: string, at?: number, bytes?: ArrayBuffer): Promise<number> {
  const fileWriter = fileWorker();
  if (!fileWriter) return Promise.reject(new Error("File store unavailable"));
  const id = ++writerSeq;
  const run = writerChain.then(
    () =>
      new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => {
          fileWriter.removeEventListener("message", onMessage);
          reject(new Error("Saving the model stalled"));
        }, 60_000);
        const onMessage = (event: MessageEvent<WriterResponse>) => {
          if (event.data?.id !== id) return;
          clearTimeout(timer);
          fileWriter.removeEventListener("message", onMessage);
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.size ?? 0);
        };
        fileWriter.addEventListener("message", onMessage);
        fileWriter.postMessage({ id, op, name, at, data: bytes });
      }),
  );
  writerChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function modelDir(): Promise<FileSystemDirectoryHandle | null> {
  if (opfsRoot !== undefined) return opfsRoot;
  try {
    if (!navigator.storage?.getDirectory) {
      opfsRoot = null;
      return null;
    }
    const root = await navigator.storage.getDirectory();
    opfsRoot = await root.getDirectoryHandle(MODEL_DIR, { create: true });
  } catch {
    opfsRoot = null;
  }
  return opfsRoot;
}

async function fileSize(name: string): Promise<number> {
  const dir = await modelDir();
  if (!dir) return 0;
  try {
    const handle = await dir.getFileHandle(name);
    return (await handle.getFile()).size;
  } catch {
    return 0;
  }
}

async function removeFile(name: string): Promise<void> {
  const dir = await modelDir();
  if (!dir) return;
  await dir.removeEntry(name).catch(() => undefined);
}

async function closePartial(id: string): Promise<void> {
  partialBytes.delete(id);
  if (!writer || writerBroken) return;
  await askWorker("close", partialName(id)).catch(() => undefined);
}

/** @returns false when the file store cannot be used and the caller should keep bytes in IndexedDB. */
async function appendPartial(id: string, bytes: ArrayBuffer): Promise<boolean> {
  if (writerBroken || !(await modelDir())) return false;
  const at = partialBytes.get(id) ?? (await fileSize(partialName(id)));
  try {
    const size = await askWorker("write", partialName(id), at, bytes);
    partialBytes.set(id, size);
    return true;
  } catch (err) {
    await closePartial(id);
    const durable = await fileSize(partialName(id));
    if (durable > 0) throw err instanceof Error ? err : new Error(String(err));
    writerBroken = true;
    return false;
  }
}

async function clearParts(id: string, count: number): Promise<void> {
  for (let i = 0; i < count; i++) await blobDel(partKey(id, i));
  await kvDel(metaKey(id));
}

/** Copy an older in-progress IndexedDB download into the file store. */
async function adoptLegacyParts(id: string): Promise<void> {
  const name = partialName(id);
  let disk = partialBytes.get(id) ?? (await fileSize(name));
  const meta = await kvGet<Manifest>(metaKey(id));
  if (!meta || meta.count === 0) return;
  if (disk > 0 && disk < meta.bytes) {
    await closePartial(id);
    await removeFile(name);
    disk = 0;
  }
  if (disk >= meta.bytes) {
    await clearParts(id, meta.count);
    return;
  }
  if (writerBroken || !(await modelDir())) return;
  for (let i = 0; i < meta.count; i++) {
    const bytes = await bytesGet(partKey(id, i));
    if (!bytes) throw new Error("Download missing a piece");
    const wrote = await appendPartial(id, bytes);
    if (!wrote) return;
  }
  await closePartial(id);
  if ((await fileSize(name)) !== meta.bytes) {
    await removeFile(name);
    return;
  }
  await clearParts(id, meta.count);
}

/** A previous build sometimes left the whole prefix under the download id. */
async function adoptLegacySingle(id: string): Promise<void> {
  if ((partialBytes.get(id) ?? (await fileSize(partialName(id)))) > 0) return;
  const meta = await kvGet<Manifest>(metaKey(id));
  if (meta && meta.count > 0) return;
  const single = await bytesGet(id);
  if (!single || single.byteLength === 0) return;
  const view = new Uint8Array(single);
  for (let at = 0; at < view.byteLength; at += FLUSH_BYTES) {
    const piece = new ArrayBuffer(Math.min(FLUSH_BYTES, view.byteLength - at));
    new Uint8Array(piece).set(view.subarray(at, at + piece.byteLength));
    if (!(await appendPartial(id, piece))) {
      await bytesSet(partKey(id, 0), single);
      await kvSet(metaKey(id), { bytes: single.byteLength, count: 1 });
      await blobDel(id);
      return;
    }
  }
  await closePartial(id);
  if ((await fileSize(partialName(id))) === single.byteLength) await blobDel(id);
}

async function flush(id: string): Promise<void> {
  const buf = buffers.get(id);
  if (!buf || buf.bytes === 0) return;
  const bytes = concat(buf.chunks);
  buffers.set(id, { chunks: [], bytes: 0 });
  if (await appendPartial(id, bytes)) return;
  const meta = (await kvGet<Manifest>(metaKey(id))) ?? { bytes: 0, count: 0 };
  await bytesSet(partKey(id, meta.count), bytes);
  await kvSet(metaKey(id), { bytes: meta.bytes + bytes.byteLength, count: meta.count + 1 });
}

async function publishFile(id: string, filename: string): Promise<void> {
  await closePartial(id);
  const dir = await modelDir();
  if (!dir) throw new Error("Could not store the model on this device.");
  const partial = await dir.getFileHandle(partialName(id));
  await removeFile(filename);
  const movable = partial as FileSystemFileHandle & { move?: (name: string) => Promise<void> };
  if (typeof movable.move === "function") {
    await movable.move(filename);
    return;
  }
  const source = await partial.getFile();
  const dest = await dir.getFileHandle(filename, { create: true });
  const writable = await dest.createWritable();
  await writable.write(source);
  await writable.close();
  await removeFile(partialName(id));
}

async function assembleStoredParts(filename: string, manifest: FileManifest): Promise<File | null> {
  const dir = await modelDir();
  if (!dir) return null;
  const handle = await dir.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  try {
    for (let i = 0; i < manifest.count; i++) {
      const bytes = await bytesGet(partKey(manifest.id, i));
      if (!bytes) {
        await writable.abort();
        return null;
      }
      await writable.write(bytes);
    }
    await writable.close();
  } catch {
    await writable.abort().catch(() => undefined);
    return null;
  }
  const file = await handle.getFile();
  if (file.size !== manifest.bytes) return file.size > 0 ? file : null;
  for (let i = 0; i < manifest.count; i++) await blobDel(partKey(manifest.id, i));
  await kvDel(filePartsKey(filename));
  return file;
}

/** The finished model, from the file store or from saved byte pieces. */
export async function readStoredModel(filename: string): Promise<Blob | undefined> {
  const dir = await modelDir();
  if (dir) {
    try {
      const handle = await dir.getFileHandle(filename);
      const file = await handle.getFile();
      if (file.size > 0) return file;
    } catch {
      /* not in the file store */
    }
  }
  const legacy = await bytesGet(`file:${filename}`);
  if (legacy && legacy.byteLength > 0) return new Blob([legacy]);
  const manifest = await kvGet<FileManifest>(filePartsKey(filename));
  if (!manifest || manifest.count === 0) return undefined;
  try {
    const file = await assembleStoredParts(filename, manifest);
    if (file) return file;
  } catch {
    /* the file store rejected the copy; read the pieces instead */
  }
  const parts: ArrayBuffer[] = [];
  for (let i = 0; i < manifest.count; i++) {
    const bytes = await bytesGet(partKey(manifest.id, i));
    if (!bytes) return undefined;
    parts.push(bytes);
  }
  return new Blob(parts);
}

/** Drop an in-progress download. Does not remove a finished model file. */
export async function discardDownload(id: string): Promise<void> {
  await enqueue(id, async () => {
    buffers.delete(id);
    await closePartial(id);
    await removeFile(partialName(id));
    const meta = await kvGet<Manifest>(metaKey(id));
    if (meta) await clearParts(id, meta.count);
    await blobDel(id);
  });
}

export async function deleteStoredModel(id: string, filename: string): Promise<void> {
  await discardDownload(id);
  await removeFile(filename);
  await blobDel(`file:${filename}`);
  const manifest = await kvGet<FileManifest>(filePartsKey(filename));
  if (!manifest) return;
  for (let i = 0; i < manifest.count; i++) await blobDel(partKey(manifest.id, i));
  await kvDel(filePartsKey(filename));
}

async function bytesOnDisk(id: string): Promise<number> {
  const known = partialBytes.get(id);
  if (known !== undefined) return known;
  const disk = await fileSize(partialName(id));
  const meta = await kvGet<Manifest>(metaKey(id));
  return Math.max(disk, meta?.bytes ?? 0);
}

export function createDownloadAdapter(): DownloadAdapter {
  return {
    writeChunk(id, chunk, offset) {
      return enqueue(id, async () => {
        if (!partialBytes.has(id) && !(buffers.get(id)?.bytes ?? 0)) {
          await adoptLegacyParts(id);
          await adoptLegacySingle(id);
        }
        const buffered = buffers.get(id)?.bytes ?? 0;
        const have = (await bytesOnDisk(id)) + buffered;
        if (offset < have) return;
        if (offset !== have) throw new Error("Download lost its place. Remove it and start again.");
        let buf = buffers.get(id);
        if (!buf) {
          buf = { chunks: [], bytes: 0 };
          buffers.set(id, buf);
        }
        const copy = new ArrayBuffer(chunk.byteLength);
        new Uint8Array(copy).set(chunk);
        buf.chunks.push(copy);
        buf.bytes += copy.byteLength;
        if (buf.bytes >= FLUSH_BYTES) await flush(id);
      });
    },
    async getReceived(id) {
      await adoptLegacyParts(id);
      await adoptLegacySingle(id);
      return (await bytesOnDisk(id)) + (buffers.get(id)?.bytes ?? 0);
    },
    async finalize(id, filename) {
      await enqueue(id, () => flush(id));
      await closePartial(id);
      await adoptLegacyParts(id);
      await adoptLegacySingle(id);
      const disk = await fileSize(partialName(id));
      if (disk > 0) {
        await publishFile(id, filename);
        const meta = await kvGet<Manifest>(metaKey(id));
        if (meta) await clearParts(id, meta.count);
        await blobDel(id);
        return `opfs:${filename}`;
      }
      const meta = await kvGet<Manifest>(metaKey(id));
      if (meta && meta.count > 0) {
        await kvSet(filePartsKey(filename), { id, count: meta.count, bytes: meta.bytes } satisfies FileManifest);
        await kvDel(metaKey(id));
        return `idb:${filename}`;
      }
      const single = await bytesGet(id);
      if (!single || single.byteLength === 0) throw new Error("Download missing");
      await bytesSet(partKey(id, 0), single);
      await blobDel(id);
      await kvSet(filePartsKey(filename), { id, count: 1, bytes: single.byteLength } satisfies FileManifest);
      return `idb:${filename}`;
    },
    remove(id) {
      return discardDownload(id);
    },
    async fetchRange(url, start, onChunk, signal) {
      if (url.startsWith("app://")) {
        await onChunk(new Uint8Array(), 0);
        return;
      }
      void navigator.storage?.persist?.();
      const headers: Record<string, string> = {};
      if (start > 0) headers.Range = `bytes=${start}-`;
      const res = await fetch(url, { headers, signal });
      if (res.status === 416 && start > 0) return;
      if (start > 0 && res.status === 200) {
        throw new Error("The server restarted the download. Remove it and start again.");
      }
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      const totalHeader = res.headers.get("content-length");
      const total = totalHeader ? Number(totalHeader) + (res.status === 206 ? start : 0) : undefined;
      if (!res.body) throw new Error("Empty body");
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) await onChunk(value, total);
      }
    },
  };
}
