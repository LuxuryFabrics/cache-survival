/**
 * Append-only writer for model files.
 * A sync access handle flushes in place. The window file stream does not:
 * bytes stay invisible until close, so a reload would lose the download.
 */

interface SyncHandle {
  close(): void;
  flush(): void;
  getSize(): number;
  write(buffer: BufferSource, options?: { at?: number }): number;
}

type WriterRequest = {
  id: number;
  op: "write" | "close";
  name: string;
  at?: number;
  data?: ArrayBuffer;
};

const DIR = "models";
const handles = new Map<string, SyncHandle>();

function withSync(handle: FileSystemFileHandle): FileSystemFileHandle & {
  createSyncAccessHandle?: () => Promise<SyncHandle>;
} {
  return handle;
}

async function openHandle(name: string): Promise<SyncHandle> {
  const existing = handles.get(name);
  if (existing) return existing;
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(DIR, { create: true });
  const file = await dir.getFileHandle(name, { create: true });
  const create = withSync(file).createSyncAccessHandle;
  if (!create) throw new Error("This browser cannot save a model file");
  const handle = await create.call(file);
  handles.set(name, handle);
  return handle;
}

self.onmessage = (event: MessageEvent<WriterRequest>) => {
  const msg = event.data;
  void (async () => {
    try {
      if (msg.op === "close") {
        const handle = handles.get(msg.name);
        if (handle) {
          handle.flush();
          handle.close();
          handles.delete(msg.name);
        }
        self.postMessage({ id: msg.id, size: 0 });
        return;
      }
      const handle = await openHandle(msg.name);
      const at = msg.at ?? handle.getSize();
      if (at !== handle.getSize()) {
        throw new Error("Download lost its place. Remove it and start again.");
      }
      if (!msg.data) throw new Error("Download missing a piece");
      const written = handle.write(new Uint8Array(msg.data), { at });
      if (written !== msg.data.byteLength) throw new Error("Could not save the whole piece");
      handle.flush();
      self.postMessage({ id: msg.id, size: handle.getSize() });
    } catch (err) {
      self.postMessage({ id: msg.id, error: err instanceof Error ? err.message : String(err) });
    }
  })();
};
