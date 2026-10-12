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
import { consumeMapFocus, deletePlace, savePlace, sendPrompt, setScreen, updateSettings, useCache } from "../hooks";
import { buildMapStyle, contourLabelField, isTileMapError } from "../lib/map-style";
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
  const searchRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Place[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [active, setActive] = useState(0);
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
  const [narrow, setNarrow] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);

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
        style: buildMapStyle(s.settings.units),
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
    map.on("move", syncZoom);
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
    const pending = s.pendingMapFocus;
    if (pending) {
      map.once("load", () => {
        map.flyTo({ center: [pending.lon, pending.lat], zoom: SEARCH_ZOOM, essential: true });
        consumeMapFocus();
      });
    }
    return () => {
      map.remove();
      mapRef.current = null;
      scaleRef.current = null;
    };
  }, []);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    if (!suggestOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [suggestOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("public-fill")) return;
    const vis = showLands ? "visible" : "none";
    map.setLayoutProperty("public-fill", "visibility", vis);
    map.setLayoutProperty("public-line", "visibility", vis);
  }, [showLands]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;
    async function claim() {
      if (stopped || !("wakeLock" in navigator)) return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        sentinel = null;
      }
    }
    void claim();
    const onVis = () => {
      if (document.visibilityState === "visible") void claim();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVis);
      void sentinel?.release();
    };
  }, []);

  useEffect(() => {
    scaleRef.current?.setUnit(s.settings.units === "mi" ? "imperial" : "metric");
    const map = mapRef.current;
    if (!map?.getLayer("contour-label")) return;
    map.setLayoutProperty("contour-label", "text-field", contourLabelField(s.settings.units));
  }, [s.settings.units]);

  useEffect(() => {
    mapRef.current?.setPadding({
      top: narrow ? 118 : 56,
      bottom: narrow ? 72 : 96,
      left: narrow ? 16 : 8,
      right: narrow ? 52 : 8,
    });
  }, [narrow]);

  useEffect(() => {
    const focus = s.pendingMapFocus;
    const map = mapRef.current;
    if (!focus || !map) return;
    setFix({ lat: focus.lat, lon: focus.lon, label: focus.label });
    map.flyTo({ center: [focus.lon, focus.lat], zoom: SEARCH_ZOOM, essential: true });
    void prefetchAround(focus.lat, focus.lon).then(() => void refreshCacheLabel());
    consumeMapFocus();
  }, [s.pendingMapFocus]);

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

  function searchNear() {
    const center = mapRef.current?.getCenter();
    if (center) return { lat: center.lat, lon: center.lng };
    if (fix) return { lat: fix.lat, lon: fix.lon };
    return undefined;
  }

  function chooseTown(p: Place) {
    fly(p.lat, p.lon, p.name);
    setSuggestOpen(false);
    setHits([]);
    setQ(p.name);
    searchRef.current?.querySelector("input")?.blur();
  }

  function onSearch(value: string) {
    setQ(value);
    const next = searchPlaces(s.places, value, 8, searchNear());
    setHits(next);
    setSuggestOpen(value.trim().length >= 2);
  }

  async function copyCoords() {
    if (!fix) return;
    const text = `${fix.lat.toFixed(5)}, ${fix.lon.toFixed(5)}`;
    try {
      await navigator.clipboard.writeText(text);
      setInfo("Coordinates copied");
    } catch {
      setInfo(text);
    }
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
    zoom < 6
      ? "Overview — relief, cities, and water"
      : zoom < 10
        ? "Towns and water — zoom for street names"
        : zoom < 13
          ? "Main streets, water, and contours"
          : "Street names and buildings";

  return (
    <div className="stack">
      <div className="row map-page-head">
        <div className="page-head">
          <p className="kicker">Topographic</p>
          <h2>Maps</h2>
        </div>
        <span className="spacer" />
        <button className="btn ghost" onClick={() => updateSettings({ units: s.settings.units === "mi" ? "km" : "mi" })}>
          Units {s.settings.units}
        </button>
      </div>
      <div className="map-wrap">
        <div className="map-tools">
          <div className="map-search" ref={searchRef}>
            <input
              className="input"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Search towns"
              aria-expanded={suggestOpen}
              aria-controls="map-town-results"
              placeholder="Search 30k+ towns…"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSuggestOpen(false);
                  return;
                }
                if (!suggestOpen || hits.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(hits.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const pick = hits[active] ?? hits[0];
                  if (pick) chooseTown(pick);
                }
              }}
            />
            {suggestOpen && (
              <div className="map-suggest" id="map-town-results" role="listbox">
                {s.places.length === 0 ? (
                  <p className="muted">Loading towns…</p>
                ) : hits.length === 0 ? (
                  <p className="muted">No towns match “{q.trim()}”.</p>
                ) : (
                  hits.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      className={i === active ? "on" : undefined}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => chooseTown(p)}
                    >
                      <strong>{p.name}</strong>
                      <span className="muted">{p.admin} {p.country} · {p.population.toLocaleString()}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="map-actions">
            <button className="btn gps-row" onClick={useGps}>GPS</button>
            <button className="btn" onClick={() => setMeasure(fix ? { lat: fix.lat, lon: fix.lon } : null)}>
              Measure
            </button>
            <button className={`chip ${showLands ? "on" : ""}`} onClick={() => setShowLands((v) => !v)}>
              Public land
            </button>
            <button className={`chip key-only ${keyOpen ? "on" : ""}`} onClick={() => setKeyOpen((v) => !v)}>
              Key
            </button>
            <button className="btn primary" onClick={() => void saveThisView()} disabled={!!saving}>
              {saving ? `Saving ${saving.done}/${saving.total}` : "Save view"}
            </button>
          </div>
        </div>
        <div className="map-stage">
          <button type="button" className="map-locate" onClick={useGps}>GPS</button>
          <div ref={ref} className="map-canvas" />
          <div className="map-hud">
            <div className="map-zoom">
              {narrow ? `z${zoom.toFixed(1)}` : `z${zoom.toFixed(1)} · ${zoomHint}`}
              {!narrow && cacheLabel ? ` · ${cacheLabel}` : ""}
            </div>
          </div>
          {showLands && (!narrow || keyOpen) && (
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
              <strong>Saving this view</strong>
              <div className="progress" style={{ marginTop: 8 }}>
                <span style={{ width: `${saving.total ? (100 * saving.done) / saving.total : 0}%` }} />
              </div>
              <p className="muted">{saving.done} / {saving.total} · terrain, streets, OSM</p>
            </div>
          )}
          {mapError && (
            <div className="card" style={{ position: "absolute", inset: 56, zIndex: 1 }}>
              <h3>Map canvas offline</h3>
              <p>{mapError}</p>
              <p className="muted">Use town search and saved places. Cached topo tiles still draw on devices with WebGL.</p>
            </div>
          )}
        </div>
        <p className="map-credit">© OpenFreeMap · OpenMapTiles · OpenStreetMap · Terrain: Mapzen / AWS</p>
        <div className="map-popup card stack">
          {narrow && s.savedPlaces.length > 0 && hits.length === 0 && (
            <div className="map-pins">
              {s.savedPlaces.map((p) => (
                <button key={p.id} type="button" className="chip" onClick={() => fly(p.lat, p.lon, p.name)}>
                  {p.name}
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
              <button className="btn" onClick={() => void copyCoords()}>Copy</button>
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
                <span className="ask-long">Ask AI about this location</span>
                <span className="ask-short">Ask AI</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {s.savedPlaces.length > 0 && (
        <div className="card saved-places">
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
