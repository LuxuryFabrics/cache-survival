import { EXPERT_ORDER, EXPERTS, type ExpertMode } from "@cache/core";
import { useState } from "react";
import { askField, exportActiveChat, newChat, openLibrary, sendPrompt, setExpert, useCache } from "../hooks";
import { DESK_STARTERS, FIELD_ACTIONS } from "../lib/field-actions";
import { recordOnce, transcribeBlob } from "../lib/whisper";

const WASH: Record<ExpertMode, string> = {
  survival: "g-mint",
  medic: "g-rose",
  navigation: "g-sky",
  "food-water": "g-lemon",
  shelter: "g-sand",
  repair: "g-lav",
  general: "g-ice",
  creative: "g-peach",
};

const ICONS: Record<ExpertMode, string[]> = {
  survival: ["⚑", "◎", "✦"],
  medic: ["✚", "♡", "◎"],
  navigation: ["◎", "△", "↕"],
  "food-water": ["◌", "≈", "✦"],
  shelter: ["⌂", "△", "☾"],
  repair: ["⚒", "✎", "✦"],
  general: ["✦", "☰", "○"],
  creative: ["✺", "✎", "✦"],
};

export function Chat() {
  const s = useCache();
  const [text, setText] = useState("");
  const convo = s.conversations.find((c) => c.id === s.activeConvoId) ?? s.conversations[0];
  const mode = (s.settings.expertMode as ExpertMode) ?? "survival";
  const empty = !convo?.messages.length;

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
    <div className="stack chat-screen">
      <div className="row">
        <div className="page-head">
          <p className="kicker">On-device experts</p>
          <h2>Chat</h2>
        </div>
        <span className="spacer" />
        <button className="btn ghost" onClick={newChat}>New</button>
        <button className="btn ghost" onClick={downloadChat}>Export</button>
      </div>

      <div className="chat-scroll stack">
      <div className="chips scroll-chips" role="tablist" aria-label="Expert mode">
        {EXPERT_ORDER.map((id) => (
          <button key={id} className={`chip ${mode === id ? "on" : ""}`} onClick={() => setExpert(id)}>
            {EXPERTS[id].label}
          </button>
        ))}
      </div>

      {empty && (
        <>
          <div className="chips scroll-chips" aria-label="Situations">
            {FIELD_ACTIONS.slice(0, 5).map((a) => (
              <button
                key={a.id}
                className="chip"
                onClick={() =>
                  askField(
                    a.prompt,
                    a.expert,
                    a.id === "here" && s.settings.lastKnown
                      ? { location: { lat: s.settings.lastKnown.lat, lon: s.settings.lastKnown.lon, label: "Last known" } }
                      : undefined,
                  )
                }
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="discover">
            {EXPERT_ORDER.map((id) => (
              <button
                key={id}
                className="soft-card"
                onClick={() => askField(DESK_STARTERS[id], id)}
              >
                <div className={`wash ${WASH[id]}`}>
                  {ICONS[id].map((ic) => (
                    <span key={ic}>{ic}</span>
                  ))}
                </div>
                <div className="body">
                  <h3>{EXPERTS[id].label}</h3>
                  <p>{EXPERTS[id].short}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {!empty && (
        <div className="stack">
          {convo?.messages.map((m) => (
            <article key={m.id} className={`msg ${m.role}`}>
              <header>
                <span>{m.role === "user" ? "You" : "CACHE"}</span>
                <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
              </header>
              <div className="body">{m.content}</div>
              {m.citations?.map((c) => (
                <button
                  key={c.documentId + c.excerpt}
                  className="cite"
                  onClick={() => openLibrary(c.documentId)}
                >
                  <strong>{c.title}</strong> · {c.source}
                  <div>{c.excerpt}</div>
                  <div className="muted">Open full manual</div>
                </button>
              ))}
            </article>
          ))}
          {s.busy && <div className="msg assistant"><div className="body">Working locally…</div></div>}
        </div>
      )}
      </div>

      <div className="composer">
        <textarea
          placeholder="Ask about water, bleeding, bearings, shelter…"
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
          <span className="muted desktop-hint">⌘/Ctrl + Enter · cites local manuals</span>
        </div>
      </div>
    </div>
  );
}
