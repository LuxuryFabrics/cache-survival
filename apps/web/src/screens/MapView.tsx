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
import { isTileMapError, MAP_STYLE } from "../lib/map-style";
import {
  ensureTileProtocol,
  planSave,
  prefetchAround,
  saveRegion,
  SEARCH_ZOOM,
  tileStats,
  type BBox,
} from "../lib/tiles";

export function MapView() {
  const s = useCache();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const scaleRef = useRef<maplibregl.ScaleControl | null>(null);
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
  const [zoom, setZoom] = useState(2.2);
  const [cacheLabel, setCacheLabel] = useState("");
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);

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
      ensureTileProtocol();
      map = new maplibregl.Map({
        container: ref.current,
        style: MAP_STYLE,
        center: [fix?.lon ?? -104.99, fix?.lat ?? 39.74],
        zoom: 2.2,
        minZoom: 1,
        maxZoom: 16,
        attributionControl: { compact: true },
        touchPitch: false,
      });
    } catch (err) {
      setMapError(err instanceof Error ? err.message : "MapLibre failed to start");
      return;
    }
    map.on("error", (e) => {
      const msg = e.error?.message ?? "";
      const sourceId = "sourceId" in e ? String((e as { sourceId?: string }).sourceId ?? "") : "";
      if (isTileMapError(msg, sourceId)) return;
      if (e.error) setMapError(e.error.message);
    });
    const scale = new maplibregl.ScaleControl({
      maxWidth: 110,
      unit: s.settings.units === "mi" ? "imperial" : "metric",
    });
    scaleRef.current = scale;
    map.addControl(scale, "bottom-left");
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), "bottom-right");
    const syncZoom = () => setZoom(map.getZoom());
    map.on("load", syncZoom);
    map.on("moveend", syncZoom);
    map.on("zoomend", syncZoom);
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
    void refreshCacheLabel();
    return () => {
      map.remove();
      mapRef.current = null;
      scaleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("public-fill")) return;
    const vis = showLands ? "visible" : "none";
    map.setLayoutProperty("public-fill", "visibility", vis);
    map.setLayoutProperty("public-line", "visibility", vis);
  }, [showLands]);

  useEffect(() => {
    scaleRef.current?.setUnit(s.settings.units === "mi" ? "imperial" : "metric");
  }, [s.settings.units]);

  async function refreshCacheLabel() {
    try {
      const stats = await tileStats();
      if (stats.count === 0) setCacheLabel("");
      else setCacheLabel(`${stats.count.toLocaleString()} tiles cached`);
    } catch {
      setCacheLabel("");
    }
  }

  function visibleBbox(): BBox | null {
    const b = mapRef.current?.getBounds();
    if (!b) return null;
    return { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
  }

  function fly(lat: number, lon: number, label: string) {
    setFix({ lat, lon, label });
    mapRef.current?.flyTo({ center: [lon, lat], zoom: SEARCH_ZOOM, essential: true });
    updateSettings({ lastKnown: { lat, lon, at: Date.now(), source: "manual" } });
    void prefetchAround(lat, lon).then(() => void refreshCacheLabel());
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

  async function saveThisView() {
    const map = mapRef.current;
    const bbox = visibleBbox();
    if (!map || !bbox) {
      setInfo("Map is not ready.");
      return;
    }
    const plan = planSave(bbox, map.getZoom());
    if (!plan.ok) {
      setInfo(plan.reason);
      return;
    }
    setSaving({ done: 0, total: plan.count });
    try {
      const result = await saveRegion(bbox, {
        minZ: plan.minZ,
        maxZ: plan.maxZ,
        onProgress: (done, total) => setSaving({ done, total }),
      });
      const missed = result.failed ? ` ${result.failed} missed (need network or unlock air-gap).` : "";
      setInfo(`Saved ${result.saved} new tiles, ${result.cached} already on device.${missed}`);
    } catch (err) {
      setInfo(err instanceof Error ? err.message : "Could not save this view.");
    } finally {
      setSaving(null);
      void refreshCacheLabel();
    }
  }

  const zoomHint =
    zoom < 7
      ? "Overview — zoom in for streets and water"
      : zoom < 11
        ? "Highways and rivers — keep zooming for streets"
        : zoom < 13
          ? "Street detail"
          : "Buildings and alleys";

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
          <button className="btn primary" onClick={() => void saveThisView()} disabled={!!saving}>
            {saving ? `Saving ${saving.done}/${saving.total}` : "Save this view"}
          </button>
        </div>
        <div ref={ref} style={{ height: "100%", background: "#e4ecee" }} />
        <div className="map-hud">
          <div className="map-zoom">
            z{zoom.toFixed(1)} · {zoomHint}
            {cacheLabel ? ` · ${cacheLabel}` : ""}
          </div>
        </div>
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
        {saving && (
          <div className="map-progress-card card">
            <strong>Saving street tiles</strong>
            <div className="progress" style={{ marginTop: 8 }}>
              <span style={{ width: `${saving.total ? (100 * saving.done) / saving.total : 0}%` }} />
            </div>
            <p className="muted">{saving.done} / {saving.total} · OpenFreeMap / OSM</p>
          </div>
        )}
        {mapError && (
          <div className="card" style={{ position: "absolute", inset: 56, zIndex: 1 }}>
            <h3>Map canvas offline</h3>
            <p>{mapError}</p>
            <p className="muted">Use town search and saved places. Street tiles still apply on devices with WebGL.</p>
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
