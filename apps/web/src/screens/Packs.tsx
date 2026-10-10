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
      blurb: `${m.description} · ${m.diskMb} MB · ${m.license}`,
      url: m.source.url,
      filename: m.filename,
      bytes: m.source.bytes,
      bundled: false,
      recommend: m.recommended,
    })),
    ...ALL_PACKS.map((p) => ({
      id: p.id,
      title: p.name,
      blurb: `${p.description} · ${p.diskMb} MB · ${p.license}`,
      url: p.source.url,
      filename: p.filename,
      bytes: p.source.bytes,
      bundled: p.source.url.startsWith("app://"),
      recommend: p.recommended,
    })),
  ];

  return (
    <div className="stack">
      <div>
        <p className="kicker">Download once · run forever</p>
        <h2>Models & data packs</h2>
        <p>
          The base app is small. Choose what to keep on this device. Bundled library, world map, and 34k places are already here.
          Chat models are optional — without one, CACHE still answers from the library.
        </p>
      </div>
      {!s.settings.onboarded && (
        <div className="card onboard stack">
          <h3>First launch</h3>
          <p>Recommended starter: keep the bundled library + map, optionally download SmolLM2 360M and whisper tiny.en when you have Wi-Fi and disk.</p>
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
              Download starter + enter
            </button>
            <button
              className="btn"
              onClick={() => {
                markOnboarded();
                updateSettings({ airgapLocked: true });
              }}
            >
              Skip models · lock air-gap
            </button>
          </div>
        </div>
      )}
      <div className="card">
        {items.map((it) => {
          const st = s.installs[it.id];
          const pct = st ? progressPct(st) : it.bundled ? 100 : 0;
          return (
            <div key={it.id} className="list-item">
              <div style={{ flex: 1 }}>
                <strong>{it.title} {it.recommend ? "· recommended" : ""}</strong>
                <div className="muted">{it.blurb}</div>
                <div className="progress" style={{ marginTop: 8 }}><span style={{ width: `${pct}%` }} /></div>
                <div className="mono">
                  {it.bundled
                    ? "Bundled · ready"
                    : st
                      ? `${st.state} · ${formatBytes(st.received)} / ${st.total ? formatBytes(st.total) : "?"}`
                      : "Not downloaded"}
                  {st?.error ? ` · ${st.error}` : ""}
                </div>
              </div>
              <div className="row">
                {!it.bundled && (
                  <button
                    className="btn"
                    onClick={() => void mgr.start(it.id, it.url, it.filename, it.bytes)}
                  >
                    {st?.state === "paused" ? "Resume" : "Download"}
                  </button>
                )}
                {st?.state === "downloading" && (
                  <button className="btn ghost" onClick={() => mgr.pause(it.id)}>Pause</button>
                )}
                {(st || it.bundled) && !it.bundled && (
                  <button className="btn danger" onClick={() => void forgetPack(it.id)}>Delete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
