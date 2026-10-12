import { airgap } from "@cache/core";
import maplibregl from "maplibre-gl";
import { tileGet, tileSet, tileStats } from "./idb";

/** Stable OpenFreeMap planet alias (OpenMapTiles schema, maxzoom 14). */
export const OFM_TILE_TEMPLATE = "https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf";
export const OFM_PROTOCOL = "ofm";
/**
 * Mapzen terrarium elevation on AWS Open Data (SRTM, USGS 3DEP, GMTED2010).
 * Zoom 0–15. Cached on demand; not bundled.
 */
export const DEM_TILE_TEMPLATE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
/**
 * Same-origin path. Air-gap treats it as local. `installDemFetch` serves IndexedDB
 * or the terrarium URL, so contour generation and hillshade share one cache.
 */
export const DEM_LOCAL_TEMPLATE = "/cache-dem/{z}/{x}/{y}.png";
export const DEM_MAX_Z = 14;
export const TILE_CAP = 4000;
export const DETAIL_MIN_Z = 8;
export const DETAIL_MAX_Z = 14;
export const SEARCH_ZOOM = 12;
export const SAT_PROTOCOL = "sat";
/**
 * USGS Imagery Only (public domain). The service lists finer levels, but
 * usable orthoimagery stops at 16. ArcGIS order is z/y/x, not z/x/y.
 * Esri World Imagery is not used here; its terms forbid a bulk offline cache.
 */
export const SAT_TILE_TEMPLATE =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";
export const SAT_SOURCE_MAX_Z = 16;
/** Finest zoom a state pack may include. Usable USGS imagery stops at 16. */
export const SAT_STATE_MAX_Z = SAT_SOURCE_MAX_Z;
/** Lowest zoom offered in the picker. Coarser levels are still stored underneath it. */
export const SAT_ZOOM_MIN = 6;
export const SAT_CAP = 16_000;
/** Typical USGS JPEG size, used only for the download hint. */
export const SAT_JPEG_KB = 27;

export type TileCoord = { z: number; x: number; y: number };
export type BBox = { west: number; south: number; east: number; north: number };

export type SavePlan =
  | { ok: true; minZ: number; maxZ: number; count: number }
  | { ok: false; reason: string };

/** Unprefixed so street tiles saved before elevation support still hit. */
export function tileKey(t: TileCoord): string {
  return `${t.z}/${t.x}/${t.y}`;
}

/** Namespaced so a DEM PNG never overwrites the vector tile at the same z/x/y. */
export function demKey(t: TileCoord): string {
  return `dem/${t.z}/${t.x}/${t.y}`;
}

export function demRemoteUrl(t: TileCoord): string {
  return DEM_TILE_TEMPLATE.replace("{z}", String(t.z)).replace("{x}", String(t.x)).replace("{y}", String(t.y));
}

export function satKey(t: TileCoord): string {
  return `sat/${t.z}/${t.x}/${t.y}`;
}

/** OSM z/x/y in, USGS z/y/x out. */
export function satRemoteUrl(t: TileCoord): string {
  return SAT_TILE_TEMPLATE.replace("{z}", String(t.z)).replace("{y}", String(t.y)).replace("{x}", String(t.x));
}

export function formatImageryMb(count: number): string {
  const mb = (count * SAT_JPEG_KB) / 1024;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

export function parseDemPath(url: string): TileCoord | null {
  const m = url.match(/\/cache-dem\/(\d+)\/(\d+)\/(\d+)\.png(?:\?.*)?$/);
  if (!m) return null;
  const z = Number(m[1]);
  const x = Number(m[2]);
  const y = Number(m[3]);
  if (z > 22) return null;
  const n = 2 ** z;
  if (x >= n || y >= n) return null;
  return { z, x, y };
}

/** Include neighboring tiles so contour lines join across the edge of a saved view. */
export function withHalo(tiles: TileCoord[], pad = 1): TileCoord[] {
  const seen = new Set<string>();
  const out: TileCoord[] = [];
  for (const t of tiles) {
    const n = 2 ** t.z;
    for (let dx = -pad; dx <= pad; dx++) {
      for (let dy = -pad; dy <= pad; dy++) {
        const x = ((t.x + dx) % n + n) % n;
        const y = t.y + dy;
        if (y < 0 || y >= n) continue;
        const key = `${t.z}/${x}/${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ z: t.z, x, y });
      }
    }
  }
  return out;
}

export function tilesForSave(bbox: BBox, minZ: number, maxZ: number): { vector: TileCoord[]; dem: TileCoord[] } {
  const vector: TileCoord[] = [];
  for (let z = maxZ; z >= minZ; z--) vector.push(...tilesForBbox(bbox, z));
  const low: TileCoord[] = [];
  for (let z = 0; z < minZ; z++) low.push(...tilesForBbox(bbox, z));
  return { vector, dem: withHalo([...low, ...vector], 1) };
}

export function parseTileUrl(url: string): TileCoord | null {
  const m = url.match(/(\d+)\/(\d+)\/(\d+)(?:\.pbf)?(?:\?.*)?$/);
  if (!m) return null;
  return { z: Number(m[1]), x: Number(m[2]), y: Number(m[3]) };
}

export function remoteTileUrl(t: TileCoord): string {
  return OFM_TILE_TEMPLATE.replace("{z}", String(t.z)).replace("{x}", String(t.x)).replace("{y}", String(t.y));
}

export function lonToTileX(lon: number, z: number): number {
  const n = 2 ** z;
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  const x = Math.floor(((wrapped + 180) / 360) * n);
  return Math.min(n - 1, Math.max(0, x));
}

export function latToTileY(lat: number, z: number): number {
  const n = 2 ** z;
  const latClamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
  const latRad = (latClamped * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return Math.min(n - 1, Math.max(0, y));
}

/** Columns covered by the box. Antimeridian boxes (west > east) wrap, without listing a tile twice. */
function tileXs(bbox: BBox, z: number): number[] {
  const n = 2 ** z;
  const x0 = lonToTileX(bbox.west, z);
  const x1 = lonToTileX(bbox.east, z);
  if (bbox.west <= bbox.east) {
    const lo = Math.min(x0, x1);
    const hi = Math.max(x0, x1);
    const xs: number[] = [];
    for (let x = lo; x <= hi; x++) xs.push(x);
    return xs;
  }
  const xs: number[] = [];
  const seen = new Set<number>();
  for (let x = x0; x < n; x++) {
    if (seen.has(x)) continue;
    seen.add(x);
    xs.push(x);
  }
  for (let x = 0; x <= x1; x++) {
    if (seen.has(x)) continue;
    seen.add(x);
    xs.push(x);
  }
  return xs;
}

function tileYRange(bbox: BBox, z: number): { yMin: number; yMax: number } {
  const y0 = latToTileY(bbox.north, z);
  const y1 = latToTileY(bbox.south, z);
  return { yMin: Math.min(y0, y1), yMax: Math.max(y0, y1) };
}

export function countTilesForBbox(bbox: BBox, z: number): number {
  const { yMin, yMax } = tileYRange(bbox, z);
  return tileXs(bbox, z).length * (yMax - yMin + 1);
}

export function tilesForBbox(bbox: BBox, z: number): TileCoord[] {
  const { yMin, yMax } = tileYRange(bbox, z);
  const out: TileCoord[] = [];
  for (const x of tileXs(bbox, z)) {
    for (let y = yMin; y <= yMax; y++) out.push({ z, x, y });
  }
  return out;
}

export function tilesForRegion(bbox: BBox, minZ: number, maxZ: number, cap = TILE_CAP): TileCoord[] {
  const out: TileCoord[] = [];
  for (let z = maxZ; z >= minZ; z--) {
    const batch = tilesForBbox(bbox, z);
    if (out.length + batch.length > cap) {
      out.push(...batch.slice(0, cap - out.length));
      break;
    }
    out.push(...batch);
  }
  return out;
}

/** Prefer detail tiles for the visible box; refuse continent-scale saves. */
export function planSave(
  bbox: BBox,
  viewZoom: number,
  cap = TILE_CAP,
  opts?: { satellite?: boolean },
): SavePlan {
  if (countTilesForBbox(bbox, DETAIL_MAX_Z) > cap) {
    return {
      ok: false,
      reason: "Zoom in to a town or valley, then Save this view. This frame is too wide to store.",
    };
  }
  const maxZ = DETAIL_MAX_Z;
  let minZ = Math.max(DETAIL_MIN_Z, Math.min(maxZ, Math.floor(viewZoom) - 1));
  const totalFrom = (start: number) => {
    let t = 0;
    for (let z = start; z <= maxZ; z++) t += countTilesForBbox(bbox, z);
    return t;
  };
  while (minZ < maxZ && totalFrom(minZ) > cap) minZ += 1;
  const saved = tilesForSave(bbox, minZ, maxZ);
  const count = saved.vector.length + saved.dem.length + (opts?.satellite ? saved.vector.length : 0);
  return { ok: true, minZ, maxZ, count };
}

export type ImageryPlan = { maxZ: number; count: number };

/**
 * Zoom 0 through each listed level, dropping the first level that would pass the cap.
 * A pack is a full pyramid, so choosing zoom 12 still stores zooms 0–12.
 */
export function imageryChoices(
  bbox: BBox,
  cap = SAT_CAP,
  maxZoom = SAT_STATE_MAX_Z,
  minZoom = SAT_ZOOM_MIN,
): ImageryPlan[] {
  const choices: ImageryPlan[] = [];
  let count = 0;
  let reached = -1;
  for (let z = 0; z <= maxZoom; z++) {
    const n = countTilesForBbox(bbox, z);
    if (count + n > cap) break;
    count += n;
    reached = z;
    if (z >= minZoom) choices.push({ maxZ: z, count });
  }
  if (choices.length === 0 && reached >= 0) choices.push({ maxZ: reached, count });
  return choices;
}

/** Finest pack that stays within the cap. */
export function planStateImagery(bbox: BBox, cap = SAT_CAP, maxZoom = SAT_STATE_MAX_Z): ImageryPlan {
  const choices = imageryChoices(bbox, cap, maxZoom, 0);
  return choices[choices.length - 1] ?? { maxZ: 0, count: 0 };
}

/** Keep a chosen zoom when that state can store it; otherwise the finest pack that fits. */
export function imageryChoiceFor(choices: ImageryPlan[], zoom: number | null): ImageryPlan | null {
  if (choices.length === 0) return null;
  if (zoom == null) return choices[choices.length - 1] ?? null;
  return (
    choices.find((choice) => choice.maxZ === zoom) ??
    [...choices].reverse().find((choice) => choice.maxZ <= zoom) ??
    choices[choices.length - 1] ??
    null
  );
}

export function tilesForImagery(bbox: BBox, maxZ: number): TileCoord[] {
  const out: TileCoord[] = [];
  for (let z = 0; z <= maxZ; z++) out.push(...tilesForBbox(bbox, z));
  return out;
}

export function bboxAround(lat: number, lon: number, km = 8): BBox {
  const dlat = km / 111.32;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dlon = km / (111.32 * Math.max(0.2, Math.abs(cos)));
  return {
    west: lon - dlon,
    south: Math.max(-85, lat - dlat),
    east: lon + dlon,
    north: Math.min(85, lat + dlat),
  };
}

export async function loadTile(t: TileCoord, signal?: AbortSignal): Promise<ArrayBuffer> {
  const key = tileKey(t);
  const cached = await tileGet(key);
  if (cached) return cached;
  if (airgap.getState().locked) {
    throw new Error("AIRGAP: tile cache miss");
  }
  const res = await fetch(remoteTileUrl(t), { signal });
  if (!res.ok) throw new Error(`tile ${res.status}`);
  const data = await res.arrayBuffer();
  try {
    await tileSet(key, data);
  } catch {
    /* quota — still return the tile this session */
  }
  return data;
}

function isJpeg(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const b = new Uint8Array(data, 0, 3);
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

export async function loadSatTile(t: TileCoord, signal?: AbortSignal): Promise<ArrayBuffer> {
  installDemFetch();
  const key = satKey(t);
  const cached = await tileGet(key);
  if (cached) return cached.slice(0);
  if (airgap.getState().locked) throw new Error("AIRGAP: tile cache miss");
  const res = await remoteFetch(satRemoteUrl(t), { signal });
  if (!res.ok) throw new Error(`tile ${res.status}`);
  const data = await res.arrayBuffer();
  if (!isJpeg(data)) throw new Error("tile not jpeg");
  try {
    await tileSet(key, data.slice(0));
  } catch {
    /* quota — still return the tile this session */
  }
  return data.slice(0);
}

export async function loadDemTile(t: TileCoord, signal?: AbortSignal): Promise<ArrayBuffer> {
  installDemFetch();
  const key = demKey(t);
  const cached = await tileGet(key);
  if (cached) return cached.slice(0);
  if (airgap.getState().locked) throw new Error("AIRGAP: tile cache miss");
  const res = await remoteFetch(demRemoteUrl(t), { signal });
  if (!res.ok) throw new Error(`tile ${res.status}`);
  const data = await res.arrayBuffer();
  try {
    await tileSet(key, data.slice(0));
  } catch {
    /* quota — still return the tile this session */
  }
  return data.slice(0);
}

let protocolInstalled = false;
let demFetchInstalled = false;
/** Fetch captured before the DEM hook, so elevation downloads do not re-enter it. */
let remoteFetch: typeof fetch = globalThis.fetch.bind(globalThis);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export function installDemFetch(): void {
  if (demFetchInstalled) return;
  demFetchInstalled = true;
  remoteFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    if (!url.includes("/cache-dem/")) return remoteFetch(input, init);
    const coord = parseDemPath(url);
    if (!coord) return new Response("bad dem url", { status: 404 });
    const data = await loadDemTile(coord, init?.signal ?? undefined);
    return new Response(data, { status: 200, headers: { "Content-Type": "image/png" } });
  };
}

export function ensureTileProtocol(): void {
  installDemFetch();
  if (protocolInstalled) return;
  protocolInstalled = true;
  maplibregl.addProtocol(OFM_PROTOCOL, async (params, abort) => {
    const coord = parseTileUrl(params.url);
    if (!coord) throw new Error("bad ofm url");
    const data = await loadTile(coord, abort.signal);
    return { data };
  });
  maplibregl.addProtocol(SAT_PROTOCOL, async (params, abort) => {
    const coord = parseTileUrl(params.url);
    if (!coord) throw new Error("bad sat url");
    const data = await loadSatTile(coord, abort.signal);
    return { data };
  });
}

type CacheJob = { kind: "ofm" | "dem" | "sat"; t: TileCoord };

async function cacheJobs(
  jobs: CacheJob[],
  opts: {
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
    concurrency?: number;
  },
): Promise<{ saved: number; cached: number; failed: number; total: number }> {
  let saved = 0;
  let cached = 0;
  let failed = 0;
  const total = jobs.length;
  let i = 0;
  const concurrency = Math.max(1, opts.concurrency ?? 6);

  async function worker() {
    while (i < jobs.length) {
      if (opts.signal?.aborted) return;
      const job = jobs[i++];
      if (!job) return;
      try {
        const key = job.kind === "dem" ? demKey(job.t) : job.kind === "sat" ? satKey(job.t) : tileKey(job.t);
        const existing = await tileGet(key);
        if (existing) cached += 1;
        else if (job.kind === "dem") await loadDemTile(job.t, opts.signal);
        else if (job.kind === "sat") await loadSatTile(job.t, opts.signal);
        else await loadTile(job.t, opts.signal);
        if (!existing) saved += 1;
      } catch {
        if (opts.signal?.aborted) return;
        failed += 1;
      }
      opts.onProgress?.(saved + cached + failed, total);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, jobs.length)) }, () => worker()));
  return { saved, cached, failed, total };
}

export async function saveRegion(
  bbox: BBox,
  opts: {
    minZ?: number;
    maxZ?: number;
    satellite?: boolean;
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ saved: number; cached: number; failed: number; total: number }> {
  const minZ = opts.minZ ?? DETAIL_MIN_Z;
  const maxZ = opts.maxZ ?? DETAIL_MAX_Z;
  const { vector, dem } = tilesForSave(bbox, minZ, maxZ);
  const jobs: CacheJob[] = [
    ...vector.map((t) => ({ kind: "ofm" as const, t })),
    ...dem.map((t) => ({ kind: "dem" as const, t })),
    ...(opts.satellite ? vector.map((t) => ({ kind: "sat" as const, t })) : []),
  ];
  return cacheJobs(jobs, { onProgress: opts.onProgress, signal: opts.signal, concurrency: opts.satellite ? 4 : 6 });
}

export async function saveSatellite(
  bbox: BBox,
  opts: {
    maxZ: number;
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
  },
): Promise<{ saved: number; cached: number; failed: number; total: number }> {
  const jobs: CacheJob[] = tilesForImagery(bbox, opts.maxZ).map((t) => ({ kind: "sat" as const, t }));
  return cacheJobs(jobs, { onProgress: opts.onProgress, signal: opts.signal, concurrency: 4 });
}

export async function prefetchAround(lat: number, lon: number, km = 6): Promise<void> {
  if (airgap.getState().locked) return;
  const bbox = bboxAround(lat, lon, km);
  const plan = planSave(bbox, SEARCH_ZOOM + 1);
  if (!plan.ok) return;
  await saveRegion(bbox, { minZ: plan.minZ, maxZ: plan.maxZ });
}

export { tileStats };
