import { searchDocuments, searchPlaces } from "@cache/core";
import { useMemo, useState } from "react";
import {
  activeModelLabel,
  askField,
  focusMap,
  openLibrary,
  openLibrarySearch,
  setScreen,
  useCache,
} from "../hooks";
import { FIELD_ACTIONS, FIRST_HOUR_DOCS, formatAgo, locationExtras } from "../lib/field-actions";

export function Field() {
  const s = useCache();
  const [q, setQ] = useState("");
  const last = s.settings.lastKnown;
  const model = activeModelLabel();

  const docs = useMemo(() => (q.trim() ? searchDocuments(s.library, q).slice(0, 4) : []), [s.library, q]);
  const towns = useMemo(() => (q.trim() ? searchPlaces(s.places, q, 4) : []), [s.places, q]);

  return (
    <div className="stack">
      <div className="page-head">
        <p className="kicker">On this device</p>
        <h2>Field</h2>
        <p>Tap a situation for a local answer. No account. Works without a chat model.</p>
      </div>

      <input
        className="input"
        placeholder="Find a manual or a town…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search manuals and towns"
      />

      {q.trim() && (
        <div className="card" style={{ padding: "8px 18px" }}>
          {docs.map((d) => (
            <button key={d.id} className="app-row" onClick={() => openLibrary(d.id, q)}>
              <div className="app-ico">☰</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{d.title}</strong>
                <div className="muted">Manual</div>
              </div>
            </button>
          ))}
          {towns.map((p) => (
            <button
              key={p.id}
              className="app-row"
              onClick={() => focusMap(p.lat, p.lon, p.name)}
            >
              <div className="app-ico">◎</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{p.name}</strong>
                <div className="muted">{p.admin} {p.country}</div>
              </div>
            </button>
          ))}
          {docs.length === 0 && towns.length === 0 && (
            <p className="muted" style={{ padding: "12px 0" }}>Nothing on device for “{q}”.</p>
          )}
          {docs.length > 0 && (
            <button className="app-row" onClick={() => openLibrarySearch(q)}>
              <div className="app-ico">→</div>
              <strong>All manuals matching “{q}”</strong>
            </button>
          )}
        </div>
      )}

      <div className="field-actions">
        {FIELD_ACTIONS.map((a) => (
          <button
            key={a.id}
            className="field-action"
            onClick={() =>
              askField(
                a.prompt,
                a.expert,
                a.id === "here" ? locationExtras(last) : undefined,
              )
            }
          >
            <div className={`wash ${a.wash}`} />
            <div className="body">
              <h3>{a.label}</h3>
              <p>{a.blurb}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="card stack">
        <h3>First hour — no chat needed</h3>
        {FIRST_HOUR_DOCS.map((d) => {
          const doc = s.library.find((x) => x.id === d.id);
          return (
            <button
              key={d.id}
              className="app-row"
              disabled={!doc}
              onClick={() => doc && openLibrary(d.id)}
            >
              <div className="app-ico">⚑</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{d.label}</strong>
                <div className="muted">{d.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card stack">
        <h3>Where you are</h3>
        {last ? (
          <>
            <p className="mono">
              {last.lat.toFixed(4)}, {last.lon.toFixed(4)} · {formatAgo(last.at)} · {last.source}
            </p>
            <div className="row">
              <button className="btn primary" onClick={() => setScreen("map")}>Open map</button>
              <button
                className="btn"
                onClick={() =>
                  askField(
                    "What are the field considerations for this location? Terrain, climate, water, and common hazards.",
                    "navigation",
                    locationExtras(last),
                  )
                }
              >
                Ask about here
              </button>
            </div>
          </>
        ) : (
          <>
            <p>No pin yet. GNSS is optional — drop a pin or search a town on the map.</p>
            <button className="btn primary" onClick={() => setScreen("map")}>Set a location</button>
          </>
        )}
        {s.savedPlaces.length > 0 && (
          <div>
            {s.savedPlaces.slice(0, 3).map((p) => (
              <button key={p.id} className="app-row" onClick={() => focusMap(p.lat, p.lon, p.name)}>
                <div className="app-ico">◎</div>
                <div>
                  <strong>{p.name}</strong>
                  <div className="mono">{p.lat.toFixed(3)}, {p.lon.toFixed(3)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="muted">
          {s.library.length} manuals · {s.places.length.toLocaleString()} towns · {model}
          {s.notes.length ? ` · ${s.notes.length} notes` : ""}
          {s.savedPlaces.length ? ` · ${s.savedPlaces.length} saved pins` : ""}
        </div>
      </div>
    </div>
  );
}
