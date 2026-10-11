# Host adapters

`@cache/core` never imports React, MapLibre, or llama.cpp. Hosts implement:

| Port | Web (this app) | Android / iOS | Desktop |
| --- | --- | --- | --- |
| `LlmAdapter` | `wllama` (llama.cpp WASM) | `llama.rn` | llama.cpp sidecar / wllama |
| Whisper | whisper.cpp pack + recorder | whisper.rn | whisper.cpp |
| Blobs | IndexedDB | app documents dir | Tauri app data |
| Maps | MapLibre GL JS + terrain, GeoJSON / OpenFreeMap + IDB tiles | MapLibre Native | MapLibre GL JS |
| FTS | in-core + optional sql.js | op-sqlite FTS5 | sqlite / sql.js |

Keep air-gap: adapters must not open sockets after `airgap.lock()`.
