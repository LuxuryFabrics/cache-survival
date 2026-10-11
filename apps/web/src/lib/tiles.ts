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

export function countTilesForBbox(bbox: BBox, z: number): number {
  const n = 2 ** z;
  const x0 = lonToTileX(bbox.west, z);
  const x1 = lonToTileX(bbox.east, z);
  const y0 = latToTileY(bbox.north, z);
  const y1 = latToTileY(bbox.south, z);
  const dx = bbox.west <= bbox.east ? Math.abs(x1 - x0) + 1 : n - x0 + x1 + 1;
  const dy = Math.abs(y1 - y0) + 1;
  return dx * dy;
}

export function tilesForBbox(bbox: BBox, z: number): TileCoord[] {
  const n = 2 ** z;
  const x0 = lonToTileX(bbox.west, z);
  const x1 = lonToTileX(bbox.east, z);
  const y0 = latToTileY(bbox.north, z);
  const y1 = latToTileY(bbox.south, z);
  const xs: number[] = [];
  if (bbox.west <= bbox.east) {
    const lo = Math.min(x0, x1);
    const hi = Math.max(x0, x1);
    for (let x = lo; x <= hi; x++) xs.push(x);
  } else {
    for (let x = x0; x < n; x++) xs.push(x);
    for (let x = 0; x <= x1; x++) xs.push(x);
  }
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const out: TileCoord[] = [];
  for (const x of xs) {
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
export function planSave(bbox: BBox, viewZoom: number, cap = TILE_CAP): SavePlan {
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
  return { ok: true, minZ, maxZ, count: saved.vector.length + saved.dem.length };
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
}

export async function saveRegion(
  bbox: BBox,
  opts: {
    minZ?: number;
    maxZ?: number;
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ saved: number; cached: number; failed: number; total: number }> {
  const minZ = opts.minZ ?? DETAIL_MIN_Z;
  const maxZ = opts.maxZ ?? DETAIL_MAX_Z;
  const { vector, dem } = tilesForSave(bbox, minZ, maxZ);
  const jobs: Array<{ kind: "ofm" | "dem"; t: TileCoord }> = [
    ...vector.map((t) => ({ kind: "ofm" as const, t })),
    ...dem.map((t) => ({ kind: "dem" as const, t })),
  ];
  let saved = 0;
  let cached = 0;
  let failed = 0;
  const total = jobs.length;
  let i = 0;
  const concurrency = 6;

  async function worker() {
    while (i < jobs.length) {
      if (opts.signal?.aborted) return;
      const job = jobs[i++];
      if (!job) return;
      try {
        const key = job.kind === "dem" ? demKey(job.t) : tileKey(job.t);
        const existing = await tileGet(key);
        if (existing) cached += 1;
        else if (job.kind === "dem") await loadDemTile(job.t, opts.signal);
        else await loadTile(job.t, opts.signal);
        if (!existing) saved += 1;
      } catch {
        failed += 1;
      }
      opts.onProgress?.(saved + cached + failed, total);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { saved, cached, failed, total };
}

export async function prefetchAround(lat: number, lon: number, km = 6): Promise<void> {
  if (airgap.getState().locked) return;
  const bbox = bboxAround(lat, lon, km);
  const plan = planSave(bbox, SEARCH_ZOOM + 1);
  if (!plan.ok) return;
  await saveRegion(bbox, { minZ: plan.minZ, maxZ: plan.maxZ });
}

export { tileStats };
