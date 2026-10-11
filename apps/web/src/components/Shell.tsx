import { newChat, selectChat, setScreen, useCache } from "../hooks";
import type { Screen } from "../store/app-store";

const ITEMS: { id: Screen; label: string; ic: string }[] = [
  { id: "chat", label: "Chat", ic: "✦" },
  { id: "map", label: "Maps", ic: "◎" },
  { id: "library", label: "Library", ic: "☰" },
  { id: "vision", label: "Vision", ic: "◌" },
  { id: "notes", label: "Notes", ic: "✎" },
  { id: "files", label: "Files", ic: "▤" },
  { id: "packs", label: "Packs", ic: "+" },
  { id: "settings", label: "Settings", ic: "○" },
];

export function Sidebar() {
  const { screen, conversations, activeConvoId } = useCache();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark">✱</span>
        CACHE
      </div>
      <div className="nav-list">
        <button className="ghost-new" onClick={newChat}>
          <span className="ic">+</span> New chat
        </button>
        {ITEMS.map((it) => (
          <button key={it.id} className={screen === it.id ? "active" : ""} onClick={() => setScreen(it.id)}>
            <span className="ic">{it.ic}</span>
            {it.label}
          </button>
        ))}
      </div>
      <div className="nav-section">On device</div>
      <div className="convo-list nav-list">
        {conversations.slice(0, 8).map((c) => (
          <button
            key={c.id}
            className={c.id === activeConvoId && screen === "chat" ? "active" : ""}
            onClick={() => selectChat(c.id)}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
          </button>
        ))}
      </div>
    </aside>
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
