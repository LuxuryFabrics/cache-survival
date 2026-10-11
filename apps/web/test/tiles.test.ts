import { describe, expect, it } from "vitest";
import {
  bboxAround,
  countTilesForBbox,
  DETAIL_MAX_Z,
  lonToTileX,
  latToTileY,
  parseTileUrl,
  planSave,
  remoteTileUrl,
  TILE_CAP,
  tilesForBbox,
  tilesForRegion,
} from "../src/lib/tiles";

describe("tile math", () => {
  it("places Denver on the expected z12 tile", () => {
    expect(lonToTileX(-104.9903, 12)).toBe(853);
    expect(latToTileY(39.7392, 12)).toBe(1554);
  });

  it("maps the equator / prime meridian to the mid-tile at z1", () => {
    expect(lonToTileX(0, 1)).toBe(1);
    expect(latToTileY(0, 1)).toBe(1);
    expect(lonToTileX(-180, 2)).toBe(0);
  });

  it("parses protocol and https tile URLs", () => {
    expect(parseTileUrl("ofm://12/853/1554")).toEqual({ z: 12, x: 853, y: 1554 });
    expect(parseTileUrl("https://tiles.openfreemap.org/planet/latest/14/4824/6158.pbf")).toEqual({
      z: 14,
      x: 4824,
      y: 6158,
    });
    expect(parseTileUrl("not-a-tile")).toBeNull();
  });

  it("builds the OpenFreeMap latest URL", () => {
    expect(remoteTileUrl({ z: 12, x: 853, y: 1554 })).toBe(
      "https://tiles.openfreemap.org/planet/latest/12/853/1554.pbf",
    );
  });

  it("lists a small city bbox at street zoom", () => {
    const box = bboxAround(39.7392, -104.9903, 4);
    expect(box.west).toBeLessThan(-104.99);
    expect(box.east).toBeGreaterThan(-104.99);
    const z14 = tilesForBbox(box, 14);
    expect(z14.length).toBeGreaterThan(0);
    expect(z14.length).toBeLessThan(80);
    expect(z14.every((t) => t.z === 14)).toBe(true);
  });

  it("caps region downloads and prefers high zoom", () => {
    const box = { west: -105.2, south: 39.6, east: -104.8, north: 39.9 };
    const tiles = tilesForRegion(box, 8, 14, 40);
    expect(tiles.length).toBeLessThanOrEqual(40);
    expect(Math.max(...tiles.map((t) => t.z))).toBe(14);
  });

  it("refuses continent-scale Save this view", () => {
    const world = { west: -180, south: -70, east: 180, north: 70 };
    expect(countTilesForBbox(world, DETAIL_MAX_Z)).toBeGreaterThan(TILE_CAP);
    const plan = planSave(world, 2);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toMatch(/Zoom in/);
  });

  it("plans a Denver neighborhood save under the cap", () => {
    const plan = planSave(bboxAround(39.7392, -104.9903, 6), 12);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.maxZ).toBe(14);
      expect(plan.count).toBeGreaterThan(0);
      expect(plan.count).toBeLessThanOrEqual(TILE_CAP);
    }
  });
});
