import { useState } from "react";
import { MobileBack } from "../components/Shell";
import { addNote, deleteNote, readNote, useCache } from "../hooks";

export function Notes() {
  const { notes } = useCache();
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [opened, setOpened] = useState<string>("");
  const [error, setError] = useState("");

  async function save() {
    setError("");
    try {
      await addNote(title || "Untitled", body, password);
      setTitle("");
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function open(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    try {
      setOpened(await readNote(note, password));
      setError("");
    } catch (e) {
      setOpened("");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="stack">
      <MobileBack />
      <div className="page-head">
        <p className="kicker">AES-256-GCM</p>
        <h2>Notes</h2>
        <p>Password stays on this device. There is no cloud reset.</p>
      </div>
      <div className="grid-2">
        <div className="card stack">
          <input className="input" type="password" placeholder="Vault password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Field notes…" value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn primary" onClick={() => void save()}>Lock & save</button>
          {error && <p className="hazard-dangerous">{error}</p>}
        </div>
        <div className="card">
          {notes.length === 0 && <p className="muted">No notes yet.</p>}
          {notes.map((n) => (
            <div key={n.id} className="list-item">
              <div>
                <strong>{n.title}</strong>
                <div className="mono">{new Date(n.updatedAt).toLocaleString()}</div>
              </div>
              <div className="row">
                <button className="btn ghost" onClick={() => void open(n.id)}>Unlock</button>
                <button className="btn danger" onClick={() => deleteNote(n.id)}>Delete</button>
              </div>
            </div>
          ))}
          {opened && (
            <div className="cite">
              <strong>Decrypted</strong>
              <div className="doc-body">{opened}</div>
              <button
                className="btn ghost"
                onClick={() => {
                  const blob = new Blob([opened], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "note.txt";
                  a.click();
                }}
              >
                Export decrypted
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
