# CACHE — Offline Survival AI

Open-source field companion. Install a small base app, download open models and data packs **once**, then run **100% offline**. No USB stick, no account, no subscription, no telemetry.

CACHE is the USB-drive “survival AI” idea without the proprietary brick: you choose the weights, the maps, and the manuals that live on *your* device.

## What works today (core, end-to-end offline)

- **Field home**: one-tap situations (bleed, water, lost, cold, shelter, this location), first-hour manuals without chat, last pin, and search across manuals + towns.
- **Phone layout**: full-screen map, thumb GPS button, copy coordinates, screen stays awake on the map, sticky chat composer, and a back path from Notes and the other More screens.
- **Expert chat** with eight desks (Survival, Medic, Navigation, Food & Water, Shelter, Repair, General, Creative). Citations open the full manual.
- **Graceful answers with no LLM**: extractive RAG over the bundled library, with citations.
- **Optional local GGUF** via llama.cpp (`wllama` WASM in the web/desktop shell; `llama.rn` / native sidecar on mobile & Tauri).
- **Offline maps**: MapLibre GL + Natural Earth world polygons, OpenFreeMap street/water/building tiles as you zoom, pin drop, distance (mi/km), saved places, 34,000+ town search, public-land overlay, “Save this view,” “Ask AI about this location.” Works with last-known or a manual pin — GNSS is optional.
- **Survival library**: 70+ public-domain / CC0 field documents (FEMA, CDC, U.S. Army FM adaptations + original notes), local full-text search.
- **Your files**: import text/PDF → on-device chunks → chat can cite them.
- **Encrypted notes**: AES-256-GCM, PBKDF2-SHA-256 (210k), password only on device.
- **Vision**: on-device field-ID catalog (plants / fungi / animals / wounds / gear) + safety line. Optional OCR. Unknown = do not eat.
- **Voice**: recorder + whisper.cpp pack hook (tiny.en / small.en). No cloud speech API.
- **Pack manager**: resume-capable downloads, delete to free space, storage estimate.
- **Air-gap lock**: after downloads, remote `fetch` is blocked. Debug mode lists attempts.
- **Always-visible** OFFLINE / AIR-GAP badge and active model name.

The bundled library is a reliable core, not 10k PDFs. The pack format is how you add full FEMA / FM / CDC trees later without growing the base install.

## Tech stack (all open source)

| Layer | Choice |
| --- | --- |
| Shared logic | TypeScript monorepo `@cache/core` |
| UI | React 19 + Vite PWA (tactical dark UI, large targets) |
| Chat inference | llama.cpp — GGUF via `wllama` (web) / `llama.rn` (mobile) / Tauri sidecar (desktop) |
| Speech | whisper.cpp (`ggml-tiny.en`, `small.en`) |
| Maps | MapLibre GL, GeoJSON + OpenFreeMap vector tiles (IndexedDB cache) |
| Search | In-core FTS-style ranking; SQLite FTS5-ready (op-sqlite / sql.js) |
| Notes | Web Crypto AES-256-GCM |
| Desktop | Tauri 2 wrapping the same UI |
| Mobile | Capacitor (same UI) or React Native + native llama.cpp |
| Places | GeoNames cities15000 (CC-BY 4.0), 34k+ towns |
| World land | Natural Earth 110m countries + 50m lakes (public domain) |

No closed APIs. No analytics SDK.

## Repository layout

```
packages/core/     # catalog, air-gap, RAG, experts, AES notes, places, vision
apps/web/          # production UI (PWA) — run this first
apps/desktop/      # Tauri 2 shell
apps/mobile/       # Capacitor / RN notes
data generation    # scripts/build_data.py
```

## Install on a Mac

Step-by-step clone, Homebrew, browser/PWA, Tauri `.app`, and iOS from Xcode: **[docs/MAC.md](docs/MAC.md)**.

```bash
git clone https://github.com/LuxuryFabrics/cache-survival.git
cd cache-survival
npm install
npm run dev
```

## Quick start (web / PWA)

Needs Node 20+ and Python 3.10+ (only to rebuild data).

```bash
python3 scripts/build_data.py   # library + GeoNames + world polygons
npm install
npm test
npm run dev                     # http://localhost:5173
```

First launch: skip models and use the library, or download SmolLM2 360M + whisper tiny.en over Wi-Fi. Then **Settings → Lock air-gap** and flip the device to airplane mode.

```bash
npm run build
npm run preview                 # production build, still local
```

## Model downloads (Hugging Face, open weights)

Configure in `packages/core/src/catalog/models.ts`. Defaults:

| Role | Model | Quant | Notes |
| --- | --- | --- | --- |
| Fast | [SmolLM2 360M Instruct](https://huggingface.co/lmstudio-community/SmolLM2-360M-Instruct-GGUF) | Q4_K_M | Best first phone / WASM download |
| Fast | [Llama 3.2 1B Instruct](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF) | Q4_K_M | Stronger small model |
| Balanced | [Llama 3.2 3B](https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF) / [Phi-3 Mini](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf) / [Gemma 2 2B](https://huggingface.co/bartowski/gemma-2-2b-it-GGUF) | Q4_K_M | Mid-range phones, native llama.cpp |
| Heavy | [Mistral 7B Instruct v0.3](https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF) | Q4_K_M | Desktop / flagship |
| STT | [whisper.cpp tiny.en / small.en](https://huggingface.co/ggerganov/whisper.cpp) | ggml | Hands-free |
| Vision (optional) | Moondream 2 or CLIP catalog + LLM hybrid | — | Catalog ships even without weights |

Target: **&lt; 5–10 tokens/sec** on recent phones with 1B–3B Q4 and **native** llama.cpp. WASM is slower; use it for desktop browsers and as a fallback.

Respect each model’s license (Llama / Gemma community licenses, Apache-2.0, MIT).

## Android / iOS

```bash
npm run build
# see apps/mobile/README.md
npx cap add android   # or ios
npx cap copy
npx cap open android
```

For production speed, implement `LlmAdapter` with [llama.rn](https://github.com/mybigday/llama.rn) and keep `@cache/core` unchanged.

## Desktop (Windows / macOS / Linux)

```bash
npm run build
npm run tauri build -w @cache/desktop
```

Requires Rust + Tauri prerequisites: https://v2.tauri.app/start/prerequisites/

Optional: point a llama.cpp sidecar at the same GGUF files in the user data dir for native throughput.

## Offline maps (street-level)

The base map is a world overview (enough to navigate continents and find 34k towns). Country polygons have the Great Lakes and other major lakes cut out, so Michigan and the other lake shores stay water even at world zoom. Zoom in (search a town, pinch, or the + control) to load **streets, water, and buildings** from [OpenFreeMap](https://openfreemap.org/) OpenMapTiles (max zoom 14, overzoom to 16).

- Tiles write through to IndexedDB as you browse
- **Save this view** keeps the current bbox (z8–14, capped at ~4,000 tiles) for air-gap use
- After **Lock air-gap**, only cached tiles render — zoom a saved town and streets stay
- Source: OpenStreetMap (ODbL) via OpenFreeMap / OpenMapTiles
- Do not bake a planetary street tileset into the base APK

A town search flies to zoom 12 so roads are visible. Wide continent frames cannot be saved; zoom to a valley or city first.

### Public vs private land

The map paints simplified **U.S. federal public land** (BLM, Forest Service, NPS, FWS, DOD, Reclamation). Cream / uncolored land is **private or unmapped** — not a parcel survey. State, tribal, and local units are often missing. Details and PAD-US download links: [docs/LANDS.md](docs/LANDS.md).

## Library packs

Seed documents are in `apps/web/public/data/library-seed.json` (generated from `scripts/build_data.py`).

To grow toward 10k–20k manuals:

1. Collect **public-domain or licensed** PDFs (FEMA, CDC, many U.S. Army FMs).
2. Extract text (Files screen, or a bulk script).
3. Ship as `library-extended.json` with the same `{ id, title, category, source, license, tags, body }` shape.

Red Cross and other copyrighted manuals are **not** bundled. Do not add them unless you have a license.

## Air-gap / debug

Settings → **Lock air-gap** wraps `fetch`. Remote Hugging Face URLs throw `AIRGAP: blocked`. Local `blob:`, `data:`, `app:`, and relative paths still work.

Enable **Debug** to see the last attempts in the status bar and settings.

## Privacy

- Models, tiles, manuals, chats, files, and notes live in IndexedDB / the OS data dir.
- Notes are AES-256-GCM. There is no password recovery channel.
- Export is local (Markdown / text download).
- No crash reporter, no analytics, no account.

## Development

```bash
npm test          # core + bundled-data tests
npm run typecheck
npm run build
```

Architecture invariants:

- Hosts (web, Tauri, RN) may only swap **adapters** (LLM, STT, blob store, GPS).
- After `airgap.lock()`, no adapter may call a remote host.
- If a model is missing, the product still works (library + maps + notes).

## Disclaimer

Field guidance only. Not medical, legal, or rescue advice. Government excerpts are shortened and may be outdated. Official publications and trained humans win. Do not eat a wild plant or mushroom because an app said so.

## License

- Code: MIT (`LICENSE`)
- Bundled notes: CC0 or U.S. Government public domain (per document)
- GeoNames gazetteer: [CC-BY 4.0](https://www.geonames.org/)
- Natural Earth: public domain
- Downloaded weights: each model’s license
