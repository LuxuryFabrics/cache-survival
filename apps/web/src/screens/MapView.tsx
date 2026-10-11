import {
  bearingDegrees,
  compassLabel,
  describeLand,
  formatDistance,
  haversineKm,
  LAND_KIND_LABEL,
  landFromProperties,
  newId,
  searchPlaces,
  type LandHit,
  type Place,
} from "@cache/core";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { deletePlace, savePlace, sendPrompt, setScreen, updateSettings, useCache } from "../hooks";

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "CACHE offline",
  sources: {
    world: { type: "geojson", data: "/data/world-110m.geojson" },
    lands: { type: "geojson", data: "/data/public-lands.geojson" },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#e4ecee" } },
    {
      id: "land",
      type: "fill",
      source: "world",
      paint: { "fill-color": "#efece3", "fill-outline-color": "#d5d1c6" },
    },
    {
      id: "borders",
      type: "line",
      source: "world",
      paint: { "line-color": "#c8c4b8", "line-width": 0.6 },
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
        "fill-opacity": 0.48,
      },
    },
    {
      id: "public-line",
      type: "line",
      source: "lands",
      paint: { "line-color": "#5c584c", "line-width": 0.4, "line-opacity": 0.35 },
    },
  ],
};

export function MapView() {
  const s = useCache();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Place[]>([]);
  const [fix, setFix] = useState<{ lat: number; lon: number; label: string } | null>(
    s.settings.lastKnown
      ? { lat: s.settings.lastKnown.lat, lon: s.settings.lastKnown.lon, label: "Last known" }
      : { lat: 39.74, lon: -104.99, label: "Default (Denver)" },
  );
  const [measure, setMeasure] = useState<{ lat: number; lon: number } | null>(null);
  const [info, setInfo] = useState("");
  const [mapError, setMapError] = useState("");
  const [showLands, setShowLands] = useState(true);
  const [tenure, setTenure] = useState<LandHit | null>(null);
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      setMapError("WebGL unavailable on this device — search, pins, measure, and Ask AI still work.");
      return;
    }
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style: STYLE,
        center: [fix?.lon ?? -104.99, fix?.lat ?? 39.74],
        zoom: 2.2,
        attributionControl: { compact: true },
      });
    } catch (err) {
      setMapError(err instanceof Error ? err.message : "MapLibre failed to start");
      return;
    }
    map.on("error", (e) => {
      if (e.error) setMapError(e.error.message);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.on("click", (e) => {
      const lat = e.lngLat.lat;
      const lon = e.lngLat.lng;
      const hits = map.queryRenderedFeatures(e.point, { layers: ["public-fill"] });
      const land = landFromProperties(hits[0]?.properties as Record<string, unknown> | undefined);
      setTenure(land);
      setProbed(true);
      setFix({ lat, lon, label: land ? land.name : "Map pin" });
      updateSettings({ lastKnown: { lat, lon, at: Date.now(), source: "map" } });
      if (measure) {
        const km = haversineKm(measure, { lat, lon });
        setInfo(
          `${formatDistance(km, s.settings.units)} · ${compassLabel(bearingDegrees(measure, { lat, lon }))} (${bearingDegrees(measure, { lat, lon }).toFixed(0)}°)`,
        );
      } else {
        setInfo(describeLand(land));
      }
      new maplibregl.Marker({ color: "#171717" }).setLngLat([lon, lat]).addTo(map);
    });
    map.on("contextmenu", (e) => {
      e.preventDefault();
      const lat = e.lngLat.lat;
      const lon = e.lngLat.lng;
      setFix({ lat, lon, label: "Long-press" });
      setInfo(`Ask AI about ${lat.toFixed(3)}, ${lon.toFixed(3)}`);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("public-fill")) return;
    const vis = showLands ? "visible" : "none";
    map.setLayoutProperty("public-fill", "visibility", vis);
    map.setLayoutProperty("public-line", "visibility", vis);
  }, [showLands]);

  function fly(lat: number, lon: number, label: string) {
    setFix({ lat, lon, label });
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 6, essential: true });
    updateSettings({ lastKnown: { lat, lon, at: Date.now(), source: "manual" } });
  }

  function useGps() {
    if (!navigator.geolocation) {
      setInfo("No geolocation API — set a pin manually. Works without GNSS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        fly(lat, lon, "GNSS");
        updateSettings({ lastKnown: { lat, lon, at: Date.now(), source: "gps" } });
      },
      () => setInfo("GNSS unavailable. Drop a pin or search a town — maps work without a signal."),
      { enableHighAccuracy: false, timeout: 4000 },
    );
  }

  return (
    <div className="stack">
      <div className="row">
        <div className="page-head">
          <p className="kicker">Offline vectors</p>
          <h2>Maps</h2>
        </div>
        <span className="spacer" />
        <button className="btn ghost" onClick={() => updateSettings({ units: s.settings.units === "mi" ? "km" : "mi" })}>
          Units {s.settings.units}
        </button>
      </div>
      <div className="map-wrap">
        <div className="map-tools">
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Search 30k+ towns…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHits(searchPlaces(s.places, e.target.value, 8));
            }}
          />
          <button className="btn" onClick={useGps}>Last / GPS</button>
          <button className="btn" onClick={() => setMeasure(fix ? { lat: fix.lat, lon: fix.lon } : null)}>
            Measure from pin
          </button>
          <button className={`chip ${showLands ? "on" : ""}`} onClick={() => setShowLands((v) => !v)}>
            Public land
          </button>
        </div>
        <div ref={ref} style={{ height: "100%", background: "#e4ecee" }} />
        {showLands && (
          <div className="land-legend">
            <div><i className="swatch priv" /> Private / unmapped</div>
            <div><i className="swatch blm" /> BLM</div>
            <div><i className="swatch usfs" /> Forest Service</div>
            <div><i className="swatch nps" /> Park Service</div>
            <div><i className="swatch fws" /> Fish & Wildlife</div>
            <div><i className="swatch dod" /> Defense</div>
          </div>
        )}
        {mapError && (
          <div className="card" style={{ position: "absolute", inset: 56, zIndex: 1 }}>
            <h3>Map canvas offline</h3>
            <p>{mapError}</p>
            <p className="muted">Use town search and saved places. Street-level PMTiles packs still apply on devices with WebGL.</p>
          </div>
        )}
        <div className="map-popup card stack">
          {hits.length > 0 && (
            <div>
              {hits.map((p) => (
                <button
                  key={p.id}
                  className="list-item"
                  style={{ width: "100%", background: "none", border: 0, textAlign: "left" }}
                  onClick={() => {
                    fly(p.lat, p.lon, p.name);
                    setHits([]);
                    setQ(p.name);
                  }}
                >
                  <strong>{p.name}</strong>
                  <span className="muted">{p.admin} {p.country} · {p.population.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
          {fix && (
            <div className="row">
              <div>
                <strong>{fix.label}</strong>
                <div className="mono">{fix.lat.toFixed(4)}, {fix.lon.toFixed(4)}</div>
                {info && <div className="muted">{info}</div>}
                {probed && tenure && (
                  <div className="badge" style={{ marginTop: 8 }}>
                    Public · {LAND_KIND_LABEL[tenure.kind]}
                  </div>
                )}
                {probed && !tenure && (
                  <div className="badge quiet" style={{ marginTop: 8 }}>Private or unmapped</div>
                )}
              </div>
              <span className="spacer" />
              <button
                className="btn"
                onClick={() =>
                  savePlace({ id: newId("pin"), name: fix.label, lat: fix.lat, lon: fix.lon, createdAt: Date.now() })
                }
              >
                Save
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setScreen("chat");
                  void sendPrompt(
                    `What are the field considerations for this location? Terrain, climate, water, and common hazards. Land tenure from the offline map: ${describeLand(tenure)}.`,
                    { location: { lat: fix.lat, lon: fix.lon, label: fix.label }, expertMode: "navigation" },
                  );
                }}
              >
                Ask AI about this location
              </button>
            </div>
          )}
        </div>
      </div>
      {s.savedPlaces.length > 0 && (
        <div className="card">
          {s.savedPlaces.map((p) => (
            <div key={p.id} className="list-item">
              <div>
                <strong>{p.name}</strong>
                <div className="mono">{p.lat.toFixed(3)}, {p.lon.toFixed(3)}</div>
              </div>
              <div className="row">
                <button className="btn ghost" onClick={() => fly(p.lat, p.lon, p.name)}>Go</button>
                <button className="btn danger" onClick={() => deletePlace(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
