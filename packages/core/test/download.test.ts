import { describe, expect, it } from "vitest";
import { DownloadManager, type DownloadAdapter } from "../src/download/manager.js";

function adapter(partial: Partial<DownloadAdapter> & Pick<DownloadAdapter, "fetchRange">): DownloadAdapter {
  return {
    async writeChunk() {},
    async getReceived() {
      return 0;
    },
    async finalize() {
      return "idb:file:x";
    },
    async remove() {},
    ...partial,
  };
}

describe("downloads", () => {
  it("stores every chunk before the download is marked ready", async () => {
    const stored: number[] = [];
    let pending = 0;
    const mgr = new DownloadManager(
      adapter({
        async writeChunk(_id, chunk) {
          pending += 1;
          await new Promise((r) => setTimeout(r, 5));
          stored.push(chunk[0] ?? 0);
          pending -= 1;
        },
        async fetchRange(_url, _start, onChunk) {
          await onChunk(new Uint8Array([1]));
          await onChunk(new Uint8Array([2]));
        },
        async finalize() {
          expect(pending).toBe(0);
          expect(stored).toEqual([1, 2]);
          return "ok";
        },
      }),
    );
    let state = "";
    mgr.subscribe((s) => {
      state = s.state;
    });
    await mgr.start("m", "https://example.com/a.gguf", "a.gguf", 2);
    expect(state).toBe("ready");
  });

  it("records a blocked download instead of leaving it idle", async () => {
    const mgr = new DownloadManager(
      adapter({
        async fetchRange() {
          throw new Error("AIRGAP: blocked GET https://example.com/a");
        },
      }),
    );
    let error = "";
    mgr.subscribe((s) => {
      if (s.error) error = s.error;
    });
    await mgr.start("m", "https://example.com/a", "a.gguf", 10);
    expect(error).toContain("AIRGAP");
  });
});
