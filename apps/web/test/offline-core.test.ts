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
    expect(searchPlaces(places, "denver")[0].name.toLowerCase()).toContain("denver");
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
