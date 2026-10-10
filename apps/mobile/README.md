# CACHE mobile

The production UI is the Vite web app (`apps/web`). Mobile ships two ways:

## 1. Capacitor (recommended shared UI)

From the repo root after `npm run build`:

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
npx cap init CACHE org.cache.survival --web-dir apps/web/dist
npx cap add android
npx cap add ios
npx cap copy
npx cap open android
npx cap open ios
```

`capacitor.config.ts` at the repo root already points at the web build.

Native inference (faster than WASM):

- Android / iOS: [llama.rn](https://github.com/mybigday/llama.rn) (llama.cpp) implementing `LlmAdapter`
- STT: [whisper.rn](https://github.com/mybigday/whisper.rn) or whisper.cpp JNI/ObjC bindings
- Maps: `@maplibre/maplibre-react-native` can replace MapLibre GL JS if you outgrow the WebView

The TypeScript core (`packages/core`) is platform-agnostic. Swap only the adapters in `apps/web/src/lib/`.

## 2. React Native / Expo shell

A thin Expo app can import `@cache/core` and reuse expert prompts, RAG, catalog, and AES notes. Use `llama.rn` + `@maplibre/maplibre-react-native` + `op-sqlite` (FTS5) for native performance.

Target: small GGUF (SmolLM2 360M or Llama 3.2 1B Q4_K_M) at 5–10 tok/s on recent phones with native llama.cpp, not WASM.
