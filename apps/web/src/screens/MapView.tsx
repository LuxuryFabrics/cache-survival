import {
  bearingDegrees,
  compassLabel,
  formatDistance,
  haversineKm,
  newId,
  searchPlaces,
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
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0d1418" } },
    {
      id: "land",
      type: "fill",
      source: "world",
      paint: { "fill-color": "#1b2620", "fill-outline-color": "#3d4a38" },
    },
    {
      id: "borders",
      type: "line",
      source: "world",
      paint: { "line-color": "#6b735f", "line-width": 0.6 },
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

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      center: [fix?.lon ?? -104.99, fix?.lat ?? 39.74],
      zoom: 2.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.on("click", (e) => {
      const lat = e.lngLat.lat;
      const lon = e.lngLat.lng;
      setFix({ lat, lon, label: "Map pin" });
      updateSettings({ lastKnown: { lat, lon, at: Date.now(), source: "map" } });
      if (measure) {
        const km = haversineKm(measure, { lat, lon });
        setInfo(
          `${formatDistance(km, s.settings.units)} · ${compassLabel(bearingDegrees(measure, { lat, lon }))} (${bearingDegrees(measure, { lat, lon }).toFixed(0)}°)`,
        );
      } else {
        setInfo(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      }
      new maplibregl.Marker({ color: "#e3a31a" }).setLngLat([lon, lat]).addTo(map);
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
        <div>
          <p className="kicker">MapLibre · offline vectors</p>
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
        </div>
        <div ref={ref} style={{ height: "100%" }} />
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
                    `What are the field considerations for this location? Terrain, climate, water, and common hazards.`,
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
