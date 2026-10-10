import { EXPERT_ORDER, EXPERTS, type ExpertMode } from "@cache/core";
import { useState } from "react";
import { exportActiveChat, newChat, selectChat, sendPrompt, setExpert, useCache } from "../hooks";
import { recordOnce, transcribeBlob } from "../lib/whisper";

export function Chat() {
  const s = useCache();
  const [text, setText] = useState("");
  const convo = s.conversations.find((c) => c.id === s.activeConvoId) ?? s.conversations[0];
  const mode = (s.settings.expertMode as ExpertMode) ?? "survival";

  async function onSend() {
    const t = text;
    setText("");
    await sendPrompt(t);
  }

  async function onVoice() {
    try {
      const blob = await recordOnce(6000);
      const spoken = await transcribeBlob(blob);
      setText(spoken);
    } catch (err) {
      setText("");
      await sendPrompt(
        `Voice capture failed: ${err instanceof Error ? err.message : String(err)}. Type the question instead.`,
      );
    }
  }

  function downloadChat() {
    const md = exportActiveChat();
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${convo?.title ?? "brief"}.md`;
    a.click();
  }

  return (
    <div className="stack">
      <div className="row">
        <div>
          <p className="kicker">Offline desk</p>
          <h2>Expert chat</h2>
        </div>
        <span className="spacer" />
        <button className="btn ghost" onClick={newChat}>New brief</button>
        <button className="btn ghost" onClick={downloadChat}>Export</button>
      </div>
      <div className="chips" role="tablist" aria-label="Expert mode">
        {EXPERT_ORDER.map((id) => (
          <button key={id} className={`chip ${mode === id ? "on" : ""}`} onClick={() => setExpert(id)}>
            {EXPERTS[id].label}
          </button>
        ))}
      </div>
      <p className="muted">{EXPERTS[mode].system.slice(0, 180)}…</p>

      {s.conversations.length > 1 && (
        <div className="chips">
          {s.conversations.slice(0, 8).map((c) => (
            <button key={c.id} className={`chip ${c.id === convo?.id ? "on" : ""}`} onClick={() => selectChat(c.id)}>
              {c.title}
            </button>
          ))}
        </div>
      )}

      <div className="stack">
        {convo?.messages.map((m) => (
          <article key={m.id} className={`msg ${m.role}`}>
            <header>
              <span>{m.role === "user" ? "YOU" : "CACHE"}</span>
              <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
            </header>
            <div className="body">{m.content}</div>
            {m.citations?.map((c) => (
              <div key={c.documentId + c.excerpt} className="cite">
                <strong>{c.title}</strong> · {c.source}
                <div>{c.excerpt}</div>
              </div>
            ))}
          </article>
        ))}
        {s.busy && <div className="msg assistant"><div className="body">Working locally…</div></div>}
      </div>

      <div className="card stack">
        <textarea
          className="input"
          placeholder="Ask the field library — bleeding, water, bearings, shelter…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void onSend();
          }}
        />
        <div className="row">
          <button className="btn primary" disabled={s.busy || !text.trim()} onClick={() => void onSend()}>
            Send
          </button>
          <button className="btn" onClick={() => void onVoice()}>Voice</button>
          <span className="muted">Ctrl/⌘ + Enter · citations from on-device manuals</span>
        </div>
      </div>
    </div>
  );
}
