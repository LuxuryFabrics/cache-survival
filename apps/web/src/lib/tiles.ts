import { airgap } from "@cache/core";
import maplibregl from "maplibre-gl";
import { tileGet, tileSet, tileStats } from "./idb";

/** Stable OpenFreeMap planet alias (OpenMapTiles schema, maxzoom 14). */
export const OFM_TILE_TEMPLATE = "https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf";
export const OFM_PROTOCOL = "ofm";
export const TILE_CAP = 4000;
export const DETAIL_MIN_Z = 8;
export const DETAIL_MAX_Z = 14;
export const SEARCH_ZOOM = 12;

export type TileCoord = { z: number; x: number; y: number };
export type BBox = { west: number; south: number; east: number; north: number };

export type SavePlan =
  | { ok: true; minZ: number; maxZ: number; count: number }
  | { ok: false; reason: string };

export function tileKey(t: TileCoord): string {
  return `${t.z}/${t.x}/${t.y}`;
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

/** Prefer street-level tiles for the visible box; refuse continent-scale saves. */
export function planSave(bbox: BBox, viewZoom: number, cap = TILE_CAP): SavePlan {
  if (countTilesForBbox(bbox, DETAIL_MAX_Z) > cap) {
    return {
      ok: false,
      reason: "Zoom in to a town or valley, then Save this view. This frame is too wide for street tiles.",
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
  return { ok: true, minZ, maxZ, count: totalFrom(minZ) };
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

let protocolInstalled = false;

export function ensureTileProtocol(): void {
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
  const tiles = tilesForRegion(bbox, minZ, maxZ);
  let saved = 0;
  let cached = 0;
  let failed = 0;
  const total = tiles.length;
  let i = 0;
  const concurrency = 6;

  async function worker() {
    while (i < tiles.length) {
      if (opts.signal?.aborted) return;
      const t = tiles[i++];
      try {
        const existing = await tileGet(tileKey(t));
        if (existing) cached += 1;
        else {
          await loadTile(t, opts.signal);
          saved += 1;
        }
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
