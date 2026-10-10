import type { Screen } from "../store/app-store";
import { setScreen, useCache } from "../hooks";

const ITEMS: { id: Screen; label: string; ic: string }[] = [
  { id: "chat", label: "Chat", ic: "⌘" },
  { id: "map", label: "Maps", ic: "⊕" },
  { id: "library", label: "Library", ic: "▣" },
  { id: "vision", label: "Vision", ic: "◎" },
  { id: "notes", label: "Notes", ic: "✎" },
  { id: "files", label: "Files", ic: "▤" },
  { id: "packs", label: "Packs", ic: "↓" },
  { id: "settings", label: "Settings", ic: "⚙" },
];

export function Nav() {
  const { screen } = useCache();
  return (
    <nav className="nav" aria-label="Primary">
      {ITEMS.map((it) => (
        <button key={it.id} className={screen === it.id ? "active" : ""} onClick={() => setScreen(it.id)}>
          <span className="ic">{it.ic}</span>
          {it.label}
        </button>
      ))}
    </nav>
  );
}

export function Tabbar() {
  const { screen } = useCache();
  const mobile = ITEMS.filter((i) => ["chat", "map", "library", "packs", "settings"].includes(i.id));
  return (
    <nav className="tabbar" aria-label="Mobile">
      {mobile.map((it) => (
        <button key={it.id} className={screen === it.id ? "active" : ""} onClick={() => setScreen(it.id)}>
          {it.label}
        </button>
      ))}
    </nav>
  );
}
