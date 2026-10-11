# Install CACHE on a Mac

These steps run the offline survival companion **locally** on macOS. After the first optional model downloads, you can turn on Airplane Mode.

## 1. Prerequisites

Install once:

```bash
# Xcode command-line tools (git, compilers)
xcode-select --install

# Homebrew: https://brew.sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install git node python@3.12
node -v    # need 20+
python3 --version
```

Optional, only if you want the **native desktop** (Tauri) or **iOS** app later:

```bash
brew install rustup-init
rustup-init -y
# iOS: install Xcode from the App Store, then:
# xcodebuild -license accept
# sudo xcode-select -s /Applications/Xcode.app
```

## 2. Clone and install

```bash
git clone https://github.com/LuxuryFabrics/cache-survival.git
cd cache-survival
npm install
```

Bundled data (library, 34k places, world map) is already in `apps/web/public/data/`. Rebuild it only if you change the generator:

```bash
python3 scripts/build_data.py
```

## 3. Run on the Mac (web / PWA)

```bash
npm test
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

First launch:

1. Keep the bundled library + map (already on disk).
2. Optionally download **SmolLM2 360M** and **whisper tiny.en** over Wi-Fi (Packs).
3. **Settings → Lock air-gap**.
4. Turn on Airplane Mode. Chat still answers from the on-device library if no GGUF is loaded.

Production build (no Vite dev server):

```bash
npm run build
npm run preview
```

To install as a Mac app from the browser: Safari or Chrome → **File → Add to Dock** / **Install CACHE** (PWA). It still stores models and notes in the browser profile (IndexedDB).

## 4. Native Mac desktop (Tauri)

Needs Rust (step 1) and a web build:

```bash
npm run build
npm run tauri build -w @cache/desktop
```

The `.app` / `.dmg` lands under `apps/desktop/src-tauri/target/release/bundle/`. First Tauri build compiles crates and takes several minutes.

Dev loop:

```bash
npm run tauri dev -w @cache/desktop
```

## 5. iPhone / iPad from this Mac

```bash
npm run build
npm i -D @capacitor/cli @capacitor/core @capacitor/ios
npx cap add ios
npx cap copy
npx cap open ios
```

In Xcode: pick your Team, then Run on a device or Simulator. For phone-speed inference, wire [llama.rn](https://github.com/mybigday/llama.rn) as the `LlmAdapter` (see `apps/mobile/README.md`). The WebView + `wllama` path works for small models but is slower.

## 6. Disk and models

| Pack | Approx. size | Notes |
| --- | --- | --- |
| Bundled library + map + places | ~5 MB | Ships with the repo |
| SmolLM2 360M Q4 | ~260 MB | Best first chat model |
| Llama 3.2 1B Q4 | ~770 MB | Stronger small model |
| whisper.cpp tiny.en | ~75 MB | Offline voice |
| Street tiles (Save this view) | tens of MB per city | OpenFreeMap / OSM, cached in IndexedDB |

Downloads go into the app’s IndexedDB / app-data folder. Delete unused packs in **Packs** to free space.

## 7. Air-gap check

1. Settings → **Lock air-gap**.
2. Enable **Debug**.
3. Turn on Airplane Mode.
4. Ask a field question. Status bar should read **AIR-GAP**. Remote Hugging Face URLs must fail; library answers still work.

## Troubleshooting

- **`npm: command not found`** — `brew install node` and open a new Terminal.
- **Blank map** — Safari/Chrome need WebGL. Town search and “Ask AI about this location” still work without it.
- **No streets when zoomed in** — browse once online, or search a town then **Save this view**. After air-gap lock, only cached tiles show detail.
- **Notes won’t unlock** — wrong password. There is no recovery channel (AES-256 on-device only).
- **Port 5173 in use** — `npm run dev -w @cache/web -- --port 5174`
- **Python / GeoNames rebuild fails** — skip it; committed `public/data` is enough to run.
