import type { DownloadAdapter } from "@cache/core";
import { blobDel, blobGet, blobSet, kvDel, kvGet, kvSet } from "./idb";

/**
 * Resumable downloads into IndexedDB. Pieces are stored separately and joined
 * at the end so a phone is not rewriting a multi-hundred-megabyte blob on
 * every network packet. After CACHE is air-gapped, remote URLs fail via the
 * fetch guard until the user asks for a download.
 */
const FLUSH_BYTES = 1024 * 1024;

type Manifest = { bytes: number; count: number };
type Buffer = { chunks: ArrayBuffer[]; bytes: number };

const tails = new Map<string, Promise<void>>();
const buffers = new Map<string, Buffer>();

function metaKey(id: string): string {
  return `dlmeta:${id}`;
}
function partKey(id: string, index: number): string {
  return `part:${id}:${index}`;
}

function enqueue(id: string, job: () => Promise<void>): Promise<void> {
  const prev = tails.get(id) ?? Promise.resolve();
  const run = prev.then(job, job);
  tails.set(id, run.then(() => undefined, () => undefined));
  return run;
}

async function flush(id: string): Promise<void> {
  const buf = buffers.get(id);
  if (!buf || buf.bytes === 0) return;
  const meta = (await kvGet<Manifest>(metaKey(id))) ?? { bytes: 0, count: 0 };
  await blobSet(partKey(id, meta.count), new Blob(buf.chunks));
  await kvSet(metaKey(id), { bytes: meta.bytes + buf.bytes, count: meta.count + 1 });
  buffers.set(id, { chunks: [], bytes: 0 });
}

/** Drop an in-progress download. Does not remove a finalized `file:` blob. */
export async function discardDownload(id: string): Promise<void> {
  await enqueue(id, async () => {
    buffers.delete(id);
    const meta = await kvGet<Manifest>(metaKey(id));
    if (meta) {
      for (let i = 0; i < meta.count; i++) await blobDel(partKey(id, i));
      await kvDel(metaKey(id));
    }
    await blobDel(id);
  });
}

export function createDownloadAdapter(): DownloadAdapter {
  return {
    writeChunk(id, chunk, offset) {
      return enqueue(id, async () => {
        const meta = (await kvGet<Manifest>(metaKey(id))) ?? { bytes: 0, count: 0 };
        const buffered = buffers.get(id)?.bytes ?? 0;
        const have = meta.bytes + buffered;
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
      const meta = await kvGet<Manifest>(metaKey(id));
      if (meta) return meta.bytes;
      return (await blobGet(id))?.size ?? 0;
    },
    async finalize(id, filename) {
      await enqueue(id, () => flush(id));
      const meta = await kvGet<Manifest>(metaKey(id));
      let blob: Blob | undefined;
      if (meta && meta.count > 0) {
        const parts: Blob[] = [];
        for (let i = 0; i < meta.count; i++) {
          const part = await blobGet(partKey(id, i));
          if (!part) throw new Error("Download missing a piece");
          parts.push(part);
        }
        blob = new Blob(parts);
        for (let i = 0; i < meta.count; i++) await blobDel(partKey(id, i));
        await kvDel(metaKey(id));
      } else {
        blob = await blobGet(id);
      }
      if (!blob || blob.size === 0) throw new Error("Download missing");
      await blobSet(`file:${filename}`, blob);
      return `idb:file:${filename}`;
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
