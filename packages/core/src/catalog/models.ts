import type { DataPackSpec, ModelSpec } from "../types.js";

/**
 * Downloadable GGUF / whisper / vision artifacts.
 * URLs point at Hugging Face `resolve` links (open weights). After the first
 * successful download the app never needs the network again.
 */
export const CHAT_MODELS: ModelSpec[] = [
  {
    id: "smollm2-360m-q4",
    name: "SmolLM2 360M Instruct",
    role: "chat",
    description:
      "Tiny instruction model. Best first download — usable on mid-range phones and in WASM. Trade depth for speed and battery.",
    params: "360M",
    quantization: "Q4_K_M",
    context: 4096,
    recommended: true,
    speedClass: "fast",
    license: "Apache-2.0",
    homepage: "https://huggingface.co/lmstudio-community/SmolLM2-360M-Instruct-GGUF",
    filename: "SmolLM2-360M-Instruct-Q4_K_M.gguf",
    source: {
      url: "https://huggingface.co/lmstudio-community/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf",
      bytes: 270_590_592,
    },
    minRamMb: 512,
    diskMb: 260,
  },
  {
    id: "llama-3.2-1b-q4",
    name: "Llama 3.2 1B Instruct",
    role: "chat",
    description: "Small Meta instruct model. Stronger reasoning than 360M, still phone-friendly with native llama.cpp.",
    params: "1B",
    quantization: "Q4_K_M",
    context: 8192,
    recommended: true,
    speedClass: "fast",
    license: "Llama 3.2 Community",
    homepage: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF",
    filename: "Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    source: {
      url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
      bytes: 808_000_000,
    },
    minRamMb: 1500,
    diskMb: 770,
  },
  {
    id: "llama-3.2-3b-q4",
    name: "Llama 3.2 3B Instruct",
    role: "chat",
    description: "Balanced small model. Target <5–10 tok/s on recent phones with Q4_K_M and native llama.cpp.",
    params: "3B",
    quantization: "Q4_K_M",
    context: 8192,
    recommended: false,
    speedClass: "balanced",
    license: "Llama 3.2 Community",
    homepage: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF",
    filename: "Llama-3.2-3B-Instruct-Q4_K_M.gguf",
    source: {
      url: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
      bytes: 2_020_000_000,
    },
    minRamMb: 3500,
    diskMb: 1930,
  },
  {
    id: "phi-3-mini-q4",
    name: "Phi-3 Mini 4K Instruct",
    role: "chat",
    description: "Microsoft Phi-3 Mini. Excellent instruction following for its size. Good medic / procedure answers.",
    params: "3.8B",
    quantization: "Q4_K_M",
    context: 4096,
    recommended: true,
    speedClass: "balanced",
    license: "MIT",
    homepage: "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf",
    filename: "Phi-3-mini-4k-instruct-q4.gguf",
    source: {
      url: "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf",
      bytes: 2_320_000_000,
    },
    minRamMb: 4000,
    diskMb: 2200,
  },
  {
    id: "gemma-2-2b-q4",
    name: "Gemma 2 2B Instruct",
    role: "chat",
    description: "Google Gemma 2 2B. Compact, high quality Q4 for everyday field questions.",
    params: "2B",
    quantization: "Q4_K_M",
    context: 8192,
    recommended: false,
    speedClass: "balanced",
    license: "Gemma",
    homepage: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF",
    filename: "gemma-2-2b-it-Q4_K_M.gguf",
    source: {
      url: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf",
      bytes: 1_700_000_000,
    },
    minRamMb: 3000,
    diskMb: 1620,
  },
  {
    id: "mistral-7b-q4",
    name: "Mistral 7B Instruct v0.3",
    role: "chat",
    description: "Heavier desktop / flagship-phone model. Strong repair and long-form answers. Needs ~5 GB RAM.",
    params: "7B",
    quantization: "Q4_K_M",
    context: 8192,
    recommended: false,
    speedClass: "heavy",
    license: "Apache-2.0",
    homepage: "https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF",
    filename: "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf",
    source: {
      url: "https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf",
      bytes: 4_370_000_000,
    },
    minRamMb: 6500,
    diskMb: 4170,
  },
];

export const WHISPER_MODELS: ModelSpec[] = [
  {
    id: "whisper-tiny-en",
    name: "whisper.cpp tiny.en",
    role: "whisper",
    description: "English-only tiny Whisper. Fast hands-free input on phones.",
    params: "39M",
    context: 30,
    recommended: true,
    speedClass: "fast",
    license: "MIT",
    homepage: "https://huggingface.co/ggerganov/whisper.cpp",
    filename: "ggml-tiny.en.bin",
    source: {
      url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin",
      bytes: 77_700_000,
    },
    minRamMb: 256,
    diskMb: 75,
  },
  {
    id: "whisper-small-en",
    name: "whisper.cpp small.en",
    role: "whisper",
    description: "More accurate English STT. Use when tiny mishears medical terms.",
    params: "244M",
    context: 30,
    recommended: false,
    speedClass: "balanced",
    license: "MIT",
    homepage: "https://huggingface.co/ggerganov/whisper.cpp",
    filename: "ggml-small.en.bin",
    source: {
      url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
      bytes: 488_000_000,
    },
    minRamMb: 700,
    diskMb: 466,
  },
];

export const VISION_MODELS: ModelSpec[] = [
  {
    id: "moondream2-q4",
    name: "Moondream 2",
    role: "vision",
    description:
      "Optional captioner (text tower). If skipped, CACHE uses the on-device field catalog. The published weight is F16, so it is a large download.",
    params: "1.9B",
    quantization: "F16",
    context: 2048,
    recommended: false,
    speedClass: "balanced",
    license: "Apache-2.0",
    homepage: "https://huggingface.co/moondream/moondream2-gguf",
    filename: "moondream2-text-model-f16.gguf",
    source: {
      url: "https://huggingface.co/moondream/moondream2-gguf/resolve/main/moondream2-text-model-f16.gguf",
      bytes: 2_839_534_976,
    },
    minRamMb: 4000,
    diskMb: 2708,
  },
];

export const ALL_MODELS: ModelSpec[] = [...CHAT_MODELS, ...WHISPER_MODELS, ...VISION_MODELS];

export function getModel(id: string): ModelSpec | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

export const STARTER_MODEL_IDS = ["smollm2-360m-q4", "whisper-tiny-en"] as const;

export const MAP_PACKS: DataPackSpec[] = [
  {
    id: "maps-world-overview",
    name: "World overview (bundled)",
    kind: "maps",
    description: "Low-zoom world land polygons, borders, and major lakes (Great Lakes, Caspian, etc.). Ships with the app. Zoom in for OpenFreeMap streets.",
    license: "Natural Earth / public domain",
    recommended: true,
    filename: "world-110m.geojson",
    source: { url: "app://bundled/world-110m.geojson", bytes: 740_000 },
    diskMb: 1,
    region: "world",
  },
  {
    id: "maps-us-streets",
    name: "Street & water detail (OpenFreeMap)",
    kind: "maps",
    description:
      "OpenStreetMap vector tiles via OpenFreeMap (OpenMapTiles, z0–14). The map fetches streets, water, and buildings as you zoom. Use Save this view to keep the current area in IndexedDB for air-gap use. Cache only the regions you need — do not bake a planetary tileset into the app.",
    license: "ODbL (OpenStreetMap) via OpenFreeMap / OpenMapTiles",
    recommended: true,
    filename: "ofm-tiles-idb",
    source: {
      url: "app://bundled/ofm-cache",
      mirrors: ["https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf", "https://openfreemap.org/"],
      bytes: 0,
    },
    diskMb: 80,
    region: "on-demand cache",
  },
  {
    id: "maps-us-public-lands",
    name: "US public lands (bundled, simplified)",
    kind: "maps",
    description:
      "Offline federal public-land polygons (BLM, USFS, NPS, FWS, DOD, Reclamation) plus Natural Earth parks. Units under ~50 km² omitted. Uncolored land is private or unmapped — not a parcel survey. Detailed PAD-US state extracts can replace this file.",
    license: "US Government public domain + Natural Earth PD",
    recommended: true,
    filename: "public-lands.geojson",
    source: { url: "app://bundled/public-lands.geojson", bytes: 6_600_000 },
    diskMb: 7,
    region: "US",
  },
];

export const LIBRARY_PACKS: DataPackSpec[] = [
  {
    id: "library-seed",
    name: "Field library (bundled)",
    kind: "library",
    description: "Public-domain / openly licensed field manuals shipped with the app (FEMA, CDC, US Army FM summaries).",
    license: "US Government public domain + original CC0 notes",
    recommended: true,
    filename: "library-seed.json",
    source: { url: "app://bundled/library-seed.json" },
    diskMb: 2,
  },
  {
    id: "library-extended",
    name: "Extended manuals pack",
    kind: "library",
    description:
      "Extra ingest pack format for dumping additional public-domain PDFs (full FEMA / FM / CDC sets). User-supplied.",
    license: "Varies per document",
    recommended: false,
    filename: "library-extended.json",
    source: { url: "app://user/library-extended.json" },
    diskMb: 200,
  },
];

export const GAZETTEER_PACK: DataPackSpec = {
  id: "gazetteer-geonames",
  name: "Places gazetteer (30k+ towns)",
  kind: "gazetteer",
  description: "GeoNames cities (pop. ≥ 15,000) plus bundled capitals/landmarks for offline place search.",
  license: "CC-BY 4.0 GeoNames",
  recommended: true,
  filename: "places.json",
  source: { url: "app://bundled/places.json" },
  diskMb: 8,
};

export const ALL_PACKS: DataPackSpec[] = [...MAP_PACKS, ...LIBRARY_PACKS, GAZETTEER_PACK];

export function getPack(id: string): DataPackSpec | undefined {
  return ALL_PACKS.find((p) => p.id === id);
}

export function catalogDiskMb(ids: string[]): number {
  const models = ids.map(getModel).filter(Boolean) as ModelSpec[];
  const packs = ids.map(getPack).filter(Boolean) as DataPackSpec[];
  return [...models, ...packs].reduce((sum, item) => sum + item.diskMb, 0);
}
