import { describe, expect, it } from "vitest";
import { buildMapStyle } from "../src/lib/map-style";

describe("map labels", () => {
  it("draws cities, streets, and water names above the roads", () => {
    const ids = buildMapStyle("mi").layers.map((layer) => layer.id);
    const order = [
      "ofm-building",
      "place-capital",
      "place-city",
      "place-town",
      "place-village",
      "place-hamlet",
      "road-major",
      "road-mid",
      "road-minor",
      "road-path",
      "water-point",
      "water-line",
      "waterway-river",
      "waterway-stream",
      "contour-label",
    ];
    let at = -1;
    for (const id of order) {
      const next = ids.indexOf(id);
      expect(next, id).toBeGreaterThan(at);
      at = next;
    }
    const contour = buildMapStyle("km").layers.find((layer) => layer.id === "contour-label");
    expect(contour?.type).toBe("symbol");
    if (contour?.type === "symbol") {
      expect(contour.layout?.["text-field"]).toEqual(["concat", ["to-string", ["round", ["get", "ele"]]], " m"]);
      expect(contour.layout?.["text-font"]).toEqual(["Noto Sans Regular"]);
    }
    const river = buildMapStyle("mi").layers.find((layer) => layer.id === "waterway-river");
    if (river?.type === "symbol") {
      expect(river.layout?.["text-font"]).toEqual(["Noto Sans Italic"]);
      expect(river["source-layer"]).toBe("waterway");
    }
  });
});
