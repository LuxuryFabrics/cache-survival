import type { InstallStatus, InstallState } from "../types.js";

export interface DownloadAdapter {
  /** Write/append bytes. Implementations should support resume via existing length. */
  writeChunk(id: string, chunk: Uint8Array, offset: number): Promise<void>;
  getReceived(id: string): Promise<number>;
  finalize(id: string, filename: string): Promise<string>;
  remove(id: string): Promise<void>;
  fetchRange(
    url: string,
    start: number,
    onChunk: (chunk: Uint8Array, total?: number) => void | Promise<void>,
    signal: AbortSignal,
  ): Promise<void>;
}

type Listener = (status: InstallStatus) => void;

export class DownloadManager {
  private status = new Map<string, InstallStatus>();
  private controllers = new Map<string, AbortController>();
  private listeners = new Set<Listener>();

  constructor(private adapter: DownloadAdapter) {}

  get(id: string): InstallStatus | undefined {
    return this.status.get(id);
  }

  all(): InstallStatus[] {
    return [...this.status.values()];
  }

  markReady(id: string, path: string, total = 0): void {
    this.put({
      id,
      state: "ready",
      received: total,
      total,
      path,
      updatedAt: Date.now(),
    });
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async start(id: string, url: string, filename: string, expected?: number): Promise<void> {
    if (this.controllers.has(id)) return;
    const controller = new AbortController();
    this.controllers.set(id, controller);
    const received0 = await this.adapter.getReceived(id);
    this.put({
      id,
      state: "downloading",
      received: received0,
      total: expected ?? 0,
      updatedAt: Date.now(),
    });

    try {
      await this.adapter.fetchRange(
        url,
        received0,
        async (chunk, total) => {
          const prev = this.status.get(id);
          const offset = prev?.received ?? received0;
          await this.adapter.writeChunk(id, chunk, offset);
          this.put({
            id,
            state: "downloading",
            received: offset + chunk.byteLength,
            total: total ?? prev?.total ?? expected ?? 0,
            updatedAt: Date.now(),
          });
        },
        controller.signal,
      );
      this.put({ ...(this.status.get(id) as InstallStatus), state: "verifying", updatedAt: Date.now() });
      const path = await this.adapter.finalize(id, filename);
      const last = this.status.get(id);
      this.put({
        id,
        state: "ready",
        received: last?.received ?? 0,
        total: last?.total ?? last?.received ?? 0,
        path,
        updatedAt: Date.now(),
      });
    } catch (err) {
      if (controller.signal.aborted) {
        this.put({
          ...(this.status.get(id) as InstallStatus),
          state: "paused",
          updatedAt: Date.now(),
        });
        return;
      }
      this.put({
        id,
        state: "error",
        received: this.status.get(id)?.received ?? 0,
        total: this.status.get(id)?.total ?? expected ?? 0,
        error: err instanceof Error ? err.message : String(err),
        updatedAt: Date.now(),
      });
    } finally {
      this.controllers.delete(id);
    }
  }

  pause(id: string): void {
    this.controllers.get(id)?.abort();
  }

  async remove(id: string): Promise<void> {
    this.controllers.get(id)?.abort();
    await this.adapter.remove(id);
    this.status.delete(id);
    this.emit({
      id,
      state: "missing",
      received: 0,
      total: 0,
      updatedAt: Date.now(),
    });
  }

  private put(status: InstallStatus): void {
    this.status.set(status.id, status);
    this.emit(status);
  }

  private emit(status: InstallStatus): void {
    for (const fn of this.listeners) fn(status);
  }
}

export function progressPct(s: InstallStatus): number {
  if (s.state === "ready") return 100;
  if (!s.total) return s.received > 0 ? 1 : 0;
  return Math.min(100, Math.round((s.received / s.total) * 100));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function isActive(state: InstallState): boolean {
  return state === "downloading" || state === "queued" || state === "verifying";
}
