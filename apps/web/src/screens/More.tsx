import { setScreen, useCache } from "../hooks";
import type { Screen } from "../store/app-store";

const ITEMS: { id: Screen; label: string; blurb: string; ic: string }[] = [
  { id: "notes", label: "Notes", blurb: "AES-256 field notes, password on device", ic: "✎" },
  { id: "vision", label: "Vision", blurb: "Field ID catalog + optional OCR", ic: "◌" },
  { id: "files", label: "Files", blurb: "Import a PDF or text into chat", ic: "▤" },
  { id: "packs", label: "Packs", blurb: "Models, maps, and disk use", ic: "+" },
  { id: "settings", label: "Settings", blurb: "Air-gap, units, contrast", ic: "○" },
];

export function More() {
  const s = useCache();
  return (
    <div className="stack">
      <div className="page-head">
        <p className="kicker">The rest of the kit</p>
        <h2>More</h2>
        <p>Notes and files stay on this phone. Packs and settings are for setup, not the field.</p>
      </div>
      <div className="card" style={{ padding: "8px 18px" }}>
        {ITEMS.map((it) => (
          <button key={it.id} className="app-row" onClick={() => setScreen(it.id)}>
            <div className="app-ico">{it.ic}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{it.label}</strong>
              <div className="muted">{it.blurb}</div>
            </div>
            {it.id === "notes" && s.notes.length > 0 && (
              <span className="badge quiet">{s.notes.length}</span>
            )}
            {it.id === "files" && s.files.length > 0 && (
              <span className="badge quiet">{s.files.length}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
