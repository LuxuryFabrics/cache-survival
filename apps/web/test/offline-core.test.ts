import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { retrieve, chunkAll, searchDocuments, searchPlaces, type LibraryDocument, type Place } from "@cache/core";

describe("bundled data", () => {
  const docs = JSON.parse(readFileSync("public/data/library-seed.json", "utf8")) as LibraryDocument[];
  const places = JSON.parse(readFileSync("public/data/places.json", "utf8")) as Place[];

  it("ships a useful library", () => {
    expect(docs.length).toBeGreaterThanOrEqual(60);
    expect(searchDocuments(docs, "tourniquet")[0].category).toBe("medical");
    const cites = retrieve({ query: "how to boil creek water", expertMode: "food-water", chunks: chunkAll(docs) });
    expect(cites.length).toBeGreaterThan(0);
  });

  it("ships 30k+ places", () => {
    expect(places.length).toBeGreaterThan(30_000);
    expect(searchPlaces(places, "denver")[0].name).toBe("Denver");
    const san = searchPlaces(places, "san", 6).map((p) => p.name);
    expect(san.some((name) => /san antonio|san diego|santiago/i.test(name))).toBe(true);
  });

  it("cuts the Great Lakes out of country land so Michigan stays a peninsula", () => {
    const world = JSON.parse(readFileSync("public/data/world-110m.geojson", "utf8")) as {
      features: { properties?: { iso?: string }; geometry: { type: string; coordinates: number[][][][] } }[];
    };
    const usa = world.features.find((f) => f.properties?.iso === "USA");
    expect(usa).toBeTruthy();
    const holes = usa!.geometry.coordinates.reduce((n, poly) => n + Math.max(0, poly.length - 1), 0);
    expect(holes).toBeGreaterThan(10);

    const inside = (x: number, y: number) => {
      const polys = usa!.geometry.coordinates;
      const pip = (ring: number[][]) => {
        let hit = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [x1, y1] = ring[i];
          const [x2, y2] = ring[j];
          if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1 + 1e-15) + x1) hit = !hit;
        }
        return hit;
      };
      return polys.some((poly) => pip(poly[0]) && !poly.slice(1).some((h) => pip(h)));
    };
    expect(inside(-84.55, 42.73)).toBe(true);
    expect(inside(-87.4, 46.55)).toBe(true);
    expect(inside(-87.0, 44.0)).toBe(false);
    expect(inside(-87.0, 47.7)).toBe(false);
    expect(inside(-82.4, 44.8)).toBe(false);
    expect(inside(-81.2, 42.2)).toBe(false);
  });

  it("ships major lakes so Michigan and the Great Lakes read at overview zoom", () => {
    const lakes = JSON.parse(readFileSync("public/data/lakes.geojson", "utf8")) as {
      features: { properties?: { name?: string } }[];
    };
    const names = lakes.features.map((f) => (f.properties?.name ?? "").toLowerCase());
    expect(names.some((n) => n.includes("michigan"))).toBe(true);
    expect(names.some((n) => n.includes("superior"))).toBe(true);
    expect(names.some((n) => n.includes("huron"))).toBe(true);
    expect(names.some((n) => n.includes("erie"))).toBe(true);
    expect(names.some((n) => n.includes("ontario"))).toBe(true);
  });
});
