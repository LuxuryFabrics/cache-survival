import type { DownloadAdapter } from "@cache/core";
import { blobDel, blobGet, blobSet } from "./idb";

/**
 * Resumable downloads into IndexedDB. Uses HTTP Range when the server allows it.
 * After CACHE is air-gapped, remote URLs fail via the fetch guard.
 */
export function createDownloadAdapter(): DownloadAdapter {
  return {
    async writeChunk(id, chunk) {
      const prev = await blobGet(id);
      const part = new Uint8Array(chunk);
      await blobSet(id, new Blob(prev ? [prev, part] : [part]));
    },
    async getReceived(id) {
      return (await blobGet(id))?.size ?? 0;
    },
    async finalize(id, filename) {
      const blob = await blobGet(id);
      if (!blob) throw new Error("Download missing");
      await blobSet(`file:${filename}`, blob);
      return `idb:file:${filename}`;
    },
    async remove(id) {
      await blobDel(id);
    },
    async fetchRange(url, start, onChunk, signal) {
      if (url.startsWith("app://")) {
        onChunk(new Uint8Array(), 0);
        return;
      }
      const headers: Record<string, string> = {};
      if (start > 0) headers.Range = `bytes=${start}-`;
      const res = await fetch(url, { headers, signal });
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status} ${url}`);
      const totalHeader = res.headers.get("content-length");
      const total = totalHeader ? Number(totalHeader) + (res.status === 206 ? start : 0) : undefined;
      if (!res.body) throw new Error("Empty body");
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) onChunk(value, total);
      }
    },
  };
}
