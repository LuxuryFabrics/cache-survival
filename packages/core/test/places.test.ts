import { describe, expect, it } from "vitest";
import { bearingDegrees, compassLabel, formatDistance, haversineKm, searchPlaces } from "../src/places/search.js";
import type { Place } from "../src/types.js";

const places: Place[] = [
  { id: "1", name: "Denver", country: "US", admin: "Colorado", lat: 39.7392, lon: -104.9903, population: 700000, featureClass: "P" },
  { id: "2", name: "Denton", country: "US", admin: "Texas", lat: 33.2148, lon: -97.1331, population: 140000, featureClass: "P" },
  { id: "3", name: "Oslo", country: "NO", admin: "Oslo", lat: 59.9139, lon: 10.7522, population: 700000, featureClass: "P" },
];

describe("places", () => {
  it("ranks prefix matches first", () => {
    const hits = searchPlaces(places, "den");
    expect(hits[0].name).toBe("Denver");
    expect(hits.map((h) => h.name)).toContain("Denton");
  });

  it("measures distance and bearing", () => {
    const km = haversineKm(places[0], places[2]);
    expect(km).toBeGreaterThan(7000);
    expect(formatDistance(1.6, "mi")).toMatch(/mi/);
    expect(compassLabel(bearingDegrees({ lat: 0, lon: 0 }, { lat: 0, lon: 10 }))).toBe("E");
  });
});
