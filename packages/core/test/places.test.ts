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

  it("ranks a large city above a tiny exact name", () => {
    const hits = searchPlaces(
      [
        { id: "a", name: "San", country: "ML", admin: "05", lat: 13.3, lon: -4.9, population: 800, featureClass: "P" },
        { id: "b", name: "San Antonio", country: "US", admin: "TX", lat: 29.42, lon: -98.49, population: 1_500_000, featureClass: "P" },
      ],
      "san",
    );
    expect(hits[0].name).toBe("San Antonio");
  });

  it("lifts a nearby town when the map is already there", () => {
    const hits = searchPlaces(
      [
        { id: "a", name: "Spring", country: "US", admin: "TX", lat: 30.08, lon: -95.42, population: 54000, featureClass: "P" },
        { id: "b", name: "Springville", country: "US", admin: "UT", lat: 40.16, lon: -111.61, population: 35000, featureClass: "P" },
      ],
      "spring",
      5,
      { lat: 40.23, lon: -111.66 },
    );
    expect(hits[0].name).toBe("Springville");
  });

  it("measures distance and bearing", () => {
    const km = haversineKm(places[0], places[2]);
    expect(km).toBeGreaterThan(7000);
    expect(formatDistance(1.6, "mi")).toMatch(/mi/);
    expect(compassLabel(bearingDegrees({ lat: 0, lon: 0 }, { lat: 0, lon: 10 }))).toBe("E");
  });
});
