import type { StyleSpecification } from "maplibre-gl";
import { OFM_PROTOCOL } from "./tiles";

const MAJOR = ["motorway", "trunk", "primary"] as const;
const MID = ["secondary", "tertiary"] as const;

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "CACHE offline",
  sources: {
    world: { type: "geojson", data: "/data/world-110m.geojson", tolerance: 0 },
    lakes: { type: "geojson", data: "/data/lakes.geojson", tolerance: 0 },
    lands: { type: "geojson", data: "/data/public-lands.geojson" },
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
      id: "ofm-wood",
      type: "fill",
      source: "ofm",
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "wood"],
      paint: { "fill-color": "#c8d4b8", "fill-opacity": 0.5 },
    },
    {
      id: "ofm-grass",
      type: "fill",
      source: "ofm",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["grass", "farmland"]]],
      paint: { "fill-color": "#dce6c8", "fill-opacity": 0.4 },
    },
    {
      id: "ofm-wetland",
      type: "fill",
      source: "ofm",
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "wetland"],
      paint: { "fill-color": "#b7cfc4", "fill-opacity": 0.45 },
    },
    {
      id: "ofm-park",
      type: "fill",
      source: "ofm",
      "source-layer": "park",
      paint: { "fill-color": "#b7c9a4", "fill-opacity": 0.28 },
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
        "line-color": "#8fb8c8",
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
  ],
};

export function isTileMapError(message: string, sourceId?: string): boolean {
  if (sourceId === "ofm") return true;
  return /tile|ofm:|AIRGAP|404|Failed to fetch|AbortError|NetworkError|tile cache|bad ofm/i.test(message);
}
