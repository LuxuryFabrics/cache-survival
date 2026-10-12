import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import mlcontour from "maplibre-contour";
import { DEM_LOCAL_TEMPLATE, DEM_MAX_Z, installDemFetch, OFM_PROTOCOL } from "./tiles";

const MAJOR = ["motorway", "trunk", "primary"] as const;
const MID = ["secondary", "tertiary"] as const;
const LABEL = "Noto Sans Regular";
const LABEL_ITALIC = "Noto Sans Italic";
const HALO = "#f4f1e8";
const NAME: ExpressionSpecification = ["coalesce", ["get", "name_en"], ["get", "name"]];
const ROAD_NAME: ExpressionSpecification = ["coalesce", ["get", "name_en"], ["get", "name"], ["get", "ref"]];
const HAS_NAME: ExpressionSpecification = ["any", ["has", "name_en"], ["has", "name"]];
const LINE: ExpressionSpecification = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false];
const POINT: ExpressionSpecification = ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false];

const CONTOUR_THRESHOLDS: { [zoom: number]: [number, number] } = {
  10: [200, 1000],
  11: [100, 500],
  12: [50, 200],
  13: [20, 100],
  14: [10, 50],
  15: [10, 50],
};

let demSource: InstanceType<typeof mlcontour.DemSource> | null = null;

function ensureTopo(): InstanceType<typeof mlcontour.DemSource> {
  installDemFetch();
  if (demSource) return demSource;
  demSource = new mlcontour.DemSource({
    url: DEM_LOCAL_TEMPLATE,
    encoding: "terrarium",
    maxzoom: DEM_MAX_Z,
    worker: false,
    cacheSize: 128,
    timeoutMs: 12_000,
    id: "cache-dem",
  });
  demSource.setupMaplibre(maplibregl);
  return demSource;
}

export function contourLabelField(units: "mi" | "km"): ExpressionSpecification {
  if (units === "mi") {
    return ["concat", ["to-string", ["round", ["*", ["get", "ele"], 3.28084]]], " ft"];
  }
  return ["concat", ["to-string", ["round", ["get", "ele"]]], " m"];
}

/** Shaded relief, contours, and labels for cities, streets, and water. */
export function buildMapStyle(units: "mi" | "km"): StyleSpecification {
  const dem = ensureTopo();
  return {
    version: 8,
    name: "CACHE topo",
    glyphs: "/fonts/{fontstack}/{range}.pbf",
    sources: {
      world: { type: "geojson", data: "/data/world-110m.geojson", tolerance: 0 },
      lakes: { type: "geojson", data: "/data/lakes.geojson", tolerance: 0 },
      lands: { type: "geojson", data: "/data/public-lands.geojson" },
      dem: {
        type: "raster-dem",
        encoding: "terrarium",
        tiles: [dem.sharedDemProtocolUrl],
        minzoom: 0,
        maxzoom: DEM_MAX_Z,
        tileSize: 256,
        attribution: "Terrain tiles © Mapzen, AWS Open Data (SRTM, USGS 3DEP, GMTED2010)",
      },
      contours: {
        type: "vector",
        tiles: [
          dem.contourProtocolUrl({
            multiplier: 1,
            thresholds: CONTOUR_THRESHOLDS,
            elevationKey: "ele",
            levelKey: "level",
            contourLayer: "contours",
            buffer: 1,
          }),
        ],
        maxzoom: 15,
      },
      ofm: {
        type: "vector",
        tiles: [`${OFM_PROTOCOL}://{z}/{x}/{y}`],
        minzoom: 0,
        maxzoom: 14,
        attribution: "© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors",
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#b7d0dc" } },
      {
        id: "land",
        type: "fill",
        source: "world",
        paint: { "fill-color": "#efece3", "fill-outline-color": "#d5d1c6" },
      },
      {
        id: "relief",
        type: "color-relief",
        source: "dem",
        paint: {
          "color-relief-opacity": 0.92,
          "color-relief-color": [
            "interpolate",
            ["linear"],
            ["elevation"],
            -8000,
            "#8eb4c6",
            -1,
            "#b7d0dc",
            0,
            "#c9d7b4",
            80,
            "#d5e3bf",
            250,
            "#e4e8c6",
            600,
            "#e6d7a6",
            1100,
            "#d7b98a",
            1800,
            "#c4a07a",
            2600,
            "#ddd4c8",
            4000,
            "#f7f7f7",
          ],
        },
      },
      {
        id: "hillshade",
        type: "hillshade",
        source: "dem",
        paint: {
          "hillshade-method": "multidirectional",
          "hillshade-exaggeration": 0.32,
          "hillshade-shadow-color": "#3f342c",
          "hillshade-highlight-color": "#fff8ee",
          "hillshade-accent-color": "#6a5846",
        },
      },
      {
        id: "ofm-wood",
        type: "fill",
        source: "ofm",
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "wood"],
        paint: { "fill-color": "#7f9a62", "fill-opacity": 0.22 },
      },
      {
        id: "ofm-grass",
        type: "fill",
        source: "ofm",
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["grass", "farmland"]]],
        paint: { "fill-color": "#c5d4a4", "fill-opacity": 0.2 },
      },
      {
        id: "ofm-wetland",
        type: "fill",
        source: "ofm",
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "wetland"],
        paint: { "fill-color": "#8fbfb4", "fill-opacity": 0.35 },
      },
      {
        id: "ofm-park",
        type: "fill",
        source: "ofm",
        "source-layer": "park",
        paint: { "fill-color": "#8eae78", "fill-opacity": 0.16 },
      },
      {
        id: "ne-lakes",
        type: "fill",
        source: "lakes",
        paint: { "fill-color": "#8ebfd2", "fill-outline-color": "#6aa8bf" },
      },
      {
        id: "public-fill",
        type: "fill",
        source: "lands",
        paint: {
          "fill-color": [
            "match",
            ["get", "kind"],
            "blm",
            "#e6c36a",
            "usfs",
            "#6ea36a",
            "nps",
            "#2f6b4f",
            "fws",
            "#4aa3a0",
            "dod",
            "#8a8a7a",
            "bor",
            "#7a9bb8",
            "#8aa37a",
          ],
          "fill-opacity": 0.42,
        },
      },
      {
        id: "ofm-water",
        type: "fill",
        source: "ofm",
        "source-layer": "water",
        paint: { "fill-color": "#8ebfd2" },
      },
      {
        id: "ofm-waterway",
        type: "line",
        source: "ofm",
        "source-layer": "waterway",
        minzoom: 8,
        paint: {
          "line-color": "#6aa4b8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 14, 1.8, 16, 2.4],
        },
      },
      {
        id: "borders",
        type: "line",
        source: "world",
        maxzoom: 8,
        paint: { "line-color": "#c8c4b8", "line-width": 0.6 },
      },
      {
        id: "public-line",
        type: "line",
        source: "lands",
        paint: { "line-color": "#5c584c", "line-width": 0.4, "line-opacity": 0.35 },
      },
      {
        id: "contours",
        type: "line",
        source: "contours",
        "source-layer": "contours",
        minzoom: 10,
        paint: {
          "line-color": ["match", ["get", "level"], 1, "#6a3f24", "#a67c52"],
          "line-width": ["match", ["get", "level"], 1, 1.15, 0.45],
          "line-opacity": 0.9,
        },
        layout: { "line-join": "round", "line-cap": "round" },
      },
      {
        id: "ofm-rail",
        type: "line",
        source: "ofm",
        "source-layer": "transportation",
        minzoom: 10,
        filter: ["in", ["get", "class"], ["literal", ["rail", "transit"]]],
        paint: {
          "line-color": "#b4ada3",
          "line-width": 0.8,
          "line-dasharray": [2, 1],
        },
      },
      {
        id: "ofm-road-casing",
        type: "line",
        source: "ofm",
        "source-layer": "transportation",
        minzoom: 7,
        filter: ["!", ["in", ["get", "class"], ["literal", ["ferry", "rail", "transit"]]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#c4b9a8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 10, 1.6, 12, 2.8, 14, 6.5, 16, 13],
        },
      },
      {
        id: "ofm-road-path",
        type: "line",
        source: "ofm",
        "source-layer": "transportation",
        minzoom: 13,
        filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
        paint: {
          "line-color": "#8a7d68",
          "line-width": 1,
          "line-dasharray": [1.5, 1.5],
        },
      },
      {
        id: "ofm-road-minor",
        type: "line",
        source: "ofm",
        "source-layer": "transportation",
        minzoom: 11,
        filter: ["in", ["get", "class"], ["literal", ["minor", "service"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#f7f4ee",
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.6, 14, 2.4, 16, 5],
        },
      },
      {
        id: "ofm-road-mid",
        type: "line",
        source: "ofm",
        "source-layer": "transportation",
        minzoom: 8,
        filter: ["in", ["get", "class"], ["literal", [...MID]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#f4efe3",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.7, 12, 2, 14, 4, 16, 8],
        },
      },
      {
        id: "ofm-road-major",
        type: "line",
        source: "ofm",
        "source-layer": "transportation",
        minzoom: 5,
        filter: ["in", ["get", "class"], ["literal", [...MAJOR]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": [
            "match",
            ["get", "class"],
            "motorway",
            "#e8a14a",
            "trunk",
            "#e6c36a",
            "#f2e6c4",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 10, 1.8, 12, 3, 14, 5.5, 16, 10],
        },
      },
      {
        id: "ofm-building",
        type: "fill",
        source: "ofm",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-color": "#d8d2c6",
          "fill-outline-color": "#c4bdb0",
          "fill-opacity": 0.88,
        },
      },
      placeLabel("place-capital", 2, ["all", ["==", ["get", "class"], "city"], ["==", ["get", "capital"], 2], HAS_NAME], [2, 13, 5, 16, 8, 20, 12, 22], "#1a1612", 8),
      placeLabel("place-city", 2, ["all", ["==", ["get", "class"], "city"], ["!=", ["get", "capital"], 2], HAS_NAME], [2, 12, 5, 14, 8, 17, 12, 20], "#1e1a16", 8),
      placeLabel("place-town", 6, ["all", ["==", ["get", "class"], "town"], HAS_NAME], [6, 12, 10, 14, 14, 16], "#2a241c", 4),
      placeLabel("place-village", 9, ["all", ["==", ["get", "class"], "village"], HAS_NAME], [9, 12, 14, 13], "#3d362c", 2),
      placeLabel("place-hamlet", 12, ["all", ["==", ["get", "class"], "hamlet"], HAS_NAME], [12, 12, 16, 13], "#4a4338", 1),
      roadLabel("road-major", 10, ["motorway", "trunk", "primary"], true, [10, 12, 14, 14], 280),
      roadLabel("road-mid", 12, ["secondary", "tertiary"], true, [12, 12, 16, 13], 240),
      roadLabel("road-minor", 13, ["minor", "service", "track"], false, [13, 12, 16, 13], 180),
      roadLabel("road-path", 15, ["path"], false, [15, 11, 16, 12], 320),
      waterLabel("water-point", "water_name", 2, ["all", POINT, HAS_NAME], false, [2, 12, 6, 14, 10, 16], 0),
      waterLabel("water-line", "water_name", 5, ["all", LINE, HAS_NAME], true, 14, 420),
      waterLabel(
        "waterway-river",
        "waterway",
        8,
        ["all", LINE, ["==", ["get", "class"], "river"], HAS_NAME],
        true,
        13,
        360,
      ),
      waterLabel(
        "waterway-stream",
        "waterway",
        12,
        ["all", LINE, ["in", ["get", "class"], ["literal", ["stream", "canal"]]], HAS_NAME],
        true,
        12,
        280,
      ),
      {
        id: "contour-label",
        type: "symbol",
        source: "contours",
        "source-layer": "contours",
        minzoom: 12,
        filter: [">", ["get", "level"], 0],
        paint: {
          "text-color": "#5c3d28",
          "text-halo-color": HALO,
          "text-halo-width": 1.4,
        },
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 180,
          "text-size": 12,
          "text-font": [LABEL],
          "text-field": contourLabelField(units),
          "text-padding": 2,
          "text-max-angle": 80,
        },
      },
    ],
  };
}

function placeLabel(
  id: string,
  minzoom: number,
  filter: ExpressionSpecification,
  stops: number[],
  color: string,
  padding: number,
): StyleSpecification["layers"][number] {
  return {
    id,
    type: "symbol",
    source: "ofm",
    "source-layer": "place",
    minzoom,
    filter,
    layout: {
      "text-field": NAME,
      "text-font": [LABEL],
      "text-size": ["interpolate", ["linear"], ["zoom"], ...stops],
      "text-max-width": 9,
      "text-padding": padding,
      "symbol-sort-key": ["coalesce", ["get", "rank"], 20],
    },
    paint: {
      "text-color": color,
      "text-halo-color": HALO,
      "text-halo-width": 1.6,
      "text-halo-blur": 0.2,
    },
  };
}

function roadLabel(
  id: string,
  minzoom: number,
  classes: string[],
  allowRef: boolean,
  stops: number[],
  spacing: number,
): StyleSpecification["layers"][number] {
  return {
    id,
    type: "symbol",
    source: "ofm",
    "source-layer": "transportation_name",
    minzoom,
    filter: [
      "all",
      LINE,
      ["in", ["get", "class"], ["literal", classes]],
      allowRef ? ["any", ["has", "name_en"], ["has", "name"], ["has", "ref"]] : HAS_NAME,
    ],
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": spacing,
      "text-field": allowRef ? ROAD_NAME : NAME,
      "text-font": [LABEL],
      "text-size": ["interpolate", ["linear"], ["zoom"], ...stops],
      "text-max-angle": 55,
      "text-padding": 2,
    },
    paint: {
      "text-color": "#2c261f",
      "text-halo-color": HALO,
      "text-halo-width": 1.4,
      "text-halo-blur": 0.2,
    },
  };
}

function waterLabel(
  id: string,
  sourceLayer: "water_name" | "waterway",
  minzoom: number,
  filter: ExpressionSpecification,
  alongLine: boolean,
  size: number | number[],
  spacing: number,
): StyleSpecification["layers"][number] {
  return {
    id,
    type: "symbol",
    source: "ofm",
    "source-layer": sourceLayer,
    minzoom,
    filter,
    layout: {
      "text-field": NAME,
      "text-font": [LABEL_ITALIC],
      "text-size": Array.isArray(size) ? ["interpolate", ["linear"], ["zoom"], ...size] : size,
      "text-letter-spacing": 0.12,
      "text-max-width": 10,
      "text-padding": 2,
      ...(alongLine
        ? {
            "symbol-placement": "line" as const,
            "symbol-spacing": spacing,
            "text-max-angle": 50,
          }
        : {}),
    },
    paint: {
      "text-color": "#134e64",
      "text-halo-color": HALO,
      "text-halo-width": 1.5,
      "text-halo-blur": 0.2,
    },
  };
}

export function isTileMapError(message: string, sourceId?: string): boolean {
  if (sourceId === "ofm" || sourceId === "dem" || sourceId === "contours") return true;
  return /tile|ofm:|cache-dem|contour|glyph|AIRGAP|404|Failed to fetch|AbortError|NetworkError|tile cache|bad ofm/i.test(
    message,
  );
}
