import type { LlmAdapter } from "@cache/core";
import { blobGet } from "./idb";
import { optionalImport } from "./optional-import";

/**
 * llama.cpp via wllama (WASM). Loaded only when a GGUF blob is on-device.
 * Native hosts (llama.rn / Tauri sidecar) implement the same LlmAdapter.
 */
export async function createWllamaAdapter(modelId: string, filename: string): Promise<LlmAdapter | null> {
  const blob = (await blobGet(`file:${filename}`)) ?? (await blobGet(filename));
  if (!blob) return { id: modelId, ready: false, async generate() { return ""; } };

  try {
    const mod = await optionalImport<{
      Wllama: new (wasm: Record<string, string>) => {
        loadModelFromBlob: (file: File) => Promise<void>;
        createCompletion: (prompt: string, opts: unknown) => Promise<string>;
      };
    }>("@wllama/wllama");
    if (!mod) {
      return {
        id: modelId,
        ready: false,
        async generate() {
          return "";
        },
      };
    }
    const wasm = {
      "single-thread/wllama.wasm": "https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.1/esm/single-thread/wllama.wasm",
    };
    const wllama = new mod.Wllama(wasm);
    await wllama.loadModelFromBlob(blob instanceof File ? blob : new File([blob], filename));
    return {
      id: modelId,
      ready: true,
      async generate(prompt, options) {
        const text = await wllama.createCompletion(prompt, {
          nPredict: options.maxTokens,
          sampling: { temp: options.temperature, top_p: 0.9 },
        });
        return String(text ?? "");
      },
    };
  } catch (err) {
    console.warn("wllama unavailable", err);
    return { id: modelId, ready: false, async generate() { return ""; } };
  }
}
