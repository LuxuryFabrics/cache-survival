import {
  ALL_MODELS,
  ALL_PACKS,
  DownloadManager,
  formatBytes,
  progressPct,
  STARTER_MODEL_IDS,
} from "@cache/core";
import { useMemo } from "react";
import { createDownloadAdapter } from "../lib/downloader";
import { forgetPack, markOnboarded, setInstall, updateSettings, useCache } from "../hooks";

const ICO: Record<string, string> = {
  "smollm2-360m-q4": "✦",
  "llama-3.2-1b-q4": "✦",
  "llama-3.2-3b-q4": "✦",
  "phi-3-mini-q4": "✦",
  "gemma-2-2b-q4": "✦",
  "mistral-7b-q4": "✦",
  "whisper-tiny-en": "◌",
  "whisper-small-en": "◌",
  "moondream2-q4": "◎",
  "maps-world-overview": "◎",
  "maps-us-streets": "◎",
  "maps-us-public-lands": "▣",
  "library-seed": "☰",
  "library-extended": "☰",
  "gazetteer-geonames": "◎",
};

export function Packs() {
  const s = useCache();
  const mgr = useMemo(() => {
    const m = new DownloadManager(createDownloadAdapter());
    m.subscribe(setInstall);
    return m;
  }, []);

  const items = [
    ...ALL_MODELS.map((m) => ({
      id: m.id,
      title: m.name,
      blurb: `${m.diskMb} MB · ${m.license}`,
      url: m.source.url,
      filename: m.filename,
      bytes: m.source.bytes,
      bundled: false,
      recommend: m.recommended,
    })),
    ...ALL_PACKS.map((p) => ({
      id: p.id,
      title: p.name,
      blurb: `${p.diskMb} MB · ${p.license}`,
      url: p.source.url,
      filename: p.filename,
      bytes: p.source.bytes,
      bundled: p.source.url.startsWith("app://"),
      recommend: p.recommended,
    })),
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <p className="kicker">Download once · run forever</p>
        <h2>Packs</h2>
        <p>Bundled library, world map, and 34k places are already here. Chat models are optional.</p>
      </div>
      {!s.settings.onboarded && (
        <div className="card onboard stack">
          <h3>First launch</h3>
          <p>Keep the bundled library and map. Optionally download SmolLM2 360M and whisper tiny.en on Wi-Fi. You will land on Field — tap a situation for a local answer.</p>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => {
                for (const id of STARTER_MODEL_IDS) {
                  const spec = ALL_MODELS.find((m) => m.id === id);
                  if (spec) void mgr.start(spec.id, spec.source.url, spec.filename, spec.source.bytes);
                }
                markOnboarded();
              }}
            >
              Download starter
            </button>
            <button
              className="btn"
              onClick={() => {
                markOnboarded();
                updateSettings({ airgapLocked: true });
              }}
            >
              Skip · lock air-gap
            </button>
          </div>
        </div>
      )}
      <div className="card" style={{ padding: "8px 18px" }}>
        {items.map((it) => {
          const st = s.installs[it.id];
          const pct = st ? progressPct(st) : it.bundled ? 100 : 0;
          const ready = it.bundled || st?.state === "ready";
          return (
            <div key={it.id} className="app-row">
              <div className="app-ico">{ICO[it.id] ?? "•"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{it.title}{it.recommend ? "  ·  recommended" : ""}</strong>
                <div className="muted">
                  {it.blurb}
                  {st && !ready ? ` · ${st.state} ${formatBytes(st.received)}` : ready ? " · ready" : " · not downloaded"}
                </div>
                {st && st.state === "downloading" && (
                  <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${pct}%` }} /></div>
                )}
              </div>
              {ready && !it.bundled ? (
                <button className="btn icon" title="Remove" onClick={() => void forgetPack(it.id)}>✓</button>
              ) : it.bundled ? (
                <span className="muted">✓</span>
              ) : (
                <button
                  className="btn icon"
                  title="Download"
                  onClick={() => void mgr.start(it.id, it.url, it.filename, it.bytes)}
                >
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
