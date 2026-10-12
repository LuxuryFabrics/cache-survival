import { describe, expect, it } from "vitest";
import { stateAt, US_STATES } from "../src/lib/states";
import {
  bboxAround,
  countTilesForBbox,
  demKey,
  demRemoteUrl,
  DETAIL_MAX_Z,
  formatImageryMb,
  imageryChoiceFor,
  imageryChoices,
  lonToTileX,
  latToTileY,
  parseDemPath,
  parseTileUrl,
  planSave,
  planStateImagery,
  remoteTileUrl,
  SAT_CAP,
  SAT_STATE_MAX_Z,
  satKey,
  satRemoteUrl,
  TILE_CAP,
  tileKey,
  tilesForBbox,
  tilesForImagery,
  tilesForRegion,
  tilesForSave,
  withHalo,
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

  it("keeps street keys unprefixed and namespaces elevation tiles", () => {
    const denver = { z: 12, x: 853, y: 1554 };
    expect(tileKey(denver)).toBe("12/853/1554");
    expect(demKey(denver)).toBe("dem/12/853/1554");
    expect(demRemoteUrl(denver)).toBe(
      "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/853/1554.png",
    );
    expect(parseDemPath("/cache-dem/12/853/1554.png")).toEqual(denver);
    expect(parseDemPath("http://127.0.0.1:5173/cache-dem/8/67/97.png")).toEqual({ z: 8, x: 67, y: 97 });
    expect(parseDemPath("https://tiles.openfreemap.org/planet/latest/12/1/2.pbf")).toBeNull();
  });

  it("pads elevation tiles by one so contours meet at the edge", () => {
    expect(withHalo([{ z: 10, x: 5, y: 5 }], 1)).toHaveLength(9);
    expect(withHalo([{ z: 2, x: 0, y: 0 }], 1)).toHaveLength(6);
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

  it("adds satellite tiles to a view save without changing the zoom range", () => {
    const box = bboxAround(39.7392, -104.9903, 6);
    const plain = planSave(box, 12);
    const withSat = planSave(box, 12, TILE_CAP, { satellite: true });
    expect(plain.ok && withSat.ok).toBe(true);
    if (!plain.ok || !withSat.ok) return;
    const saved = tilesForSave(box, plain.minZ, plain.maxZ);
    expect(withSat.minZ).toBe(plain.minZ);
    expect(withSat.maxZ).toBe(plain.maxZ);
    expect(withSat.count).toBe(plain.count + saved.vector.length);
    expect(planSave({ west: -180, south: -70, east: 180, north: 70 }, 2, TILE_CAP, { satellite: true }).ok).toBe(false);
  });

  it("requests USGS imagery in ArcGIS z/y/x order", () => {
    const denver = { z: 12, x: 853, y: 1554 };
    expect(satKey(denver)).toBe("sat/12/853/1554");
    expect(satRemoteUrl(denver)).toBe(
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/12/1554/853",
    );
    expect(formatImageryMb(70)).toBe("1.8 MB");
    expect(formatImageryMb(8000)).toBe("211 MB");
    expect(formatImageryMb(16000)).toBe("422 MB");
  });

  it("plans a state imagery pack under the cap, including antimeridian Alaska", () => {
    expect(US_STATES).toHaveLength(52);
    expect(new Set(US_STATES.map((state) => state.id)).size).toBe(52);
    const alaska = US_STATES.find((state) => state.id === "AK");
    expect(alaska?.bbox.west).toBeGreaterThan(alaska?.bbox.east ?? 0);
    expect(tilesForBbox(alaska!.bbox, 0)).toHaveLength(1);
    for (const state of US_STATES) {
      const plan = planStateImagery(state.bbox);
      expect(plan.count, state.id).toBeLessThanOrEqual(SAT_CAP);
      expect(plan.count, state.id).toBeGreaterThan(0);
      expect(plan.maxZ, state.id).toBeGreaterThanOrEqual(9);
      expect(plan.maxZ, state.id).toBeLessThanOrEqual(SAT_STATE_MAX_Z);
      expect(tilesForImagery(state.bbox, plan.maxZ), state.id).toHaveLength(plan.count);
      if (plan.maxZ < SAT_STATE_MAX_Z) {
        expect(plan.count + countTilesForBbox(state.bbox, plan.maxZ + 1), state.id).toBeGreaterThan(SAT_CAP);
      }
    }
    const dc = US_STATES.find((state) => state.id === "DC")!;
    const dcChoices = imageryChoices(dc.bbox);
    expect(dcChoices.map((choice) => choice.maxZ)).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(dcChoices[dcChoices.length - 1]).toEqual({ maxZ: 16, count: 2611 });
    expect(imageryChoiceFor(dcChoices, null)?.maxZ).toBe(16);
    expect(imageryChoiceFor(dcChoices, 12)?.count).toBe(tilesForImagery(dc.bbox, 12).length);
    expect(imageryChoiceFor(dcChoices, 12)?.maxZ).toBe(12);
    const texas = imageryChoices(US_STATES.find((state) => state.id === "TX")!.bbox);
    expect(texas[texas.length - 1]?.maxZ).toBe(11);
    expect(imageryChoiceFor(texas, 16)?.maxZ).toBe(11);
    expect(planStateImagery(dc.bbox).maxZ).toBe(16);
    expect(planStateImagery(US_STATES.find((state) => state.id === "TX")!.bbox).maxZ).toBe(11);
    expect(planStateImagery(US_STATES.find((state) => state.id === "NY")!.bbox).maxZ).toBe(12);
    expect(planStateImagery(US_STATES.find((state) => state.id === "AK")!.bbox).maxZ).toBe(9);
    expect(stateAt(38.9072, -77.0369)?.id).toBe("DC");
    expect(stateAt(39.29, -76.61)?.id).toBe("MD");
    expect(stateAt(39.7392, -104.9903)?.id).toBe("CO");
    expect(stateAt(61.2181, -149.9003)?.id).toBe("AK");
    expect(stateAt(52.9, 172.9)?.id).toBe("AK");
    expect(stateAt(21.3069, -157.8583)?.id).toBe("HI");
    expect(stateAt(18.4655, -66.1057)?.id).toBe("PR");
  });
});
