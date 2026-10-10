import type { AirgapState, NetworkAttempt } from "../types.js";

const LOCAL_SCHEMES = ["blob:", "data:", "file:", "app:", "capacitor:", "tauri:", "asset:", "http://localhost", "http://127.0.0.1"];

export function isLocalUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  return LOCAL_SCHEMES.some((s) => trimmed.startsWith(s));
}

export class AirgapGuard {
  private locked = false;
  private debug = false;
  private attempts: NetworkAttempt[] = [];
  private listeners = new Set<(state: AirgapState) => void>();
  private snapshot: AirgapState = { locked: false, debug: false, attempts: [] };
  private installed = false;
  private originalFetch?: typeof fetch;

  lock(): void {
    this.locked = true;
    this.install();
    this.emit();
  }

  unlock(): void {
    this.locked = false;
    this.emit();
  }

  setDebug(debug: boolean): void {
    this.debug = debug;
    this.install();
    this.emit();
  }

  getSnapshot = (): AirgapState => this.snapshot;

  getState(): AirgapState {
    return this.snapshot;
  }

  /** Stable subscribe for useSyncExternalStore — do not .bind() in render. */
  subscribe(fn: (state: AirgapState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  subscribeStore = (onStoreChange: () => void): (() => void) => {
    return this.subscribe(() => onStoreChange());
  };

  /** Record an attempt from platform adapters (XHR, WebSocket, Tauri HTTP). */
  record(method: string, url: string, source: string): boolean {
    const blocked = this.locked && !isLocalUrl(url);
    this.attempts.push({ at: Date.now(), method, url, blocked, source });
    if (this.attempts.length > 400) this.attempts.splice(0, this.attempts.length - 200);
    this.emit();
    return blocked;
  }

  private install(): void {
    if (this.installed) return;
    if (typeof globalThis.fetch !== "function") return;
    this.installed = true;
    this.originalFetch = globalThis.fetch.bind(globalThis);
    const guard = this;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = init?.method ?? (typeof input === "object" && !(input instanceof URL) ? input.method : "GET");
      const blocked = guard.record(method || "GET", url, "fetch");
      if (blocked) {
        throw new Error(`AIRGAP: blocked ${method} ${url}`);
      }
      return guard.originalFetch!(input, init);
    };
  }

  private emit(): void {
    this.snapshot = {
      locked: this.locked,
      debug: this.debug,
      attempts: this.attempts.slice(-200),
    };
    const state = this.snapshot;
    for (const fn of this.listeners) fn(state);
  }
}

export const airgap = new AirgapGuard();
