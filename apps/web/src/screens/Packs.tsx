import {
  ALL_MODELS,
  ALL_PACKS,
  DownloadManager,
  formatBytes,
  progressPct,
  STARTER_MODEL_IDS,
} from "@cache/core";
import { useEffect, useMemo, useState } from "react";
import { createDownloadAdapter } from "../lib/downloader";
import { MobileBack } from "../components/Shell";
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

function downloadFailure(error: string): string {
  if (error.includes("AIRGAP")) return "Air-gap blocked this. Tap Retry to open the network and start it.";
  if (error.includes("404")) return "That file is no longer at the published link.";
  if (error.includes("Failed to fetch") || error.includes("NetworkError")) return "The phone could not reach the file. Stay on Wi-Fi and tap Retry.";
  if (error.includes("lost its place") || error.includes("restarted the download")) return error;
  if (error.includes("preparing Blob") || error.includes("object store")) {
    return "The browser blocked saving the model. Retry once. If it still fails, leave private browsing and try again.";
  }
  return error;
}

export function Packs() {
  const s = useCache();
  const [netNote, setNetNote] = useState("");
  const mgr = useMemo(() => {
    const m = new DownloadManager(createDownloadAdapter());
    m.subscribe(setInstall);
    return m;
  }, []);
  const downloading = Object.values(s.installs).some((i) => i.state === "downloading" || i.state === "verifying");

  useEffect(() => {
    if (!downloading || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancel = false;
    void navigator.wakeLock.request("screen").then((held) => {
      if (cancel) void held.release();
      else lock = held;
    }).catch(() => undefined);
    return () => {
      cancel = true;
      void lock?.release();
    };
  }, [downloading]);

  function begin(id: string, url: string, filename: string, bytes?: number) {
    if (s.settings.airgapLocked) {
      updateSettings({ airgapLocked: false });
      setNetNote("Network opened for this download. Lock air-gap again in Settings when it finishes.");
    }
    void mgr.start(id, url, filename, bytes);
  }

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
      <MobileBack />
      <div className="page-head">
        <p className="kicker">Download once · run forever</p>
        <h2>Packs</h2>
        <p>Bundled library, world map, and 34k places are already here. Chat models are optional.</p>
      </div>
      {s.settings.airgapLocked && (
        <p className="muted">Air-gap is on. Starting a download opens the network for that file.</p>
      )}
      {netNote && <p className="muted">{netNote}</p>}
      {downloading && <p className="muted">Leave this screen open. A phone pauses the transfer if it sleeps.</p>}
      {!s.settings.onboarded && (
        <div className="card onboard stack">
          <h3>First launch</h3>
          <p>Keep the bundled library and map. Optionally download SmolLM2 360M and whisper tiny.en on Wi-Fi. Progress stays on this list. Next launch opens Field.</p>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => {
                if (s.settings.airgapLocked) {
                  updateSettings({ airgapLocked: false });
                  setNetNote("Network opened for this download. Lock air-gap again in Settings when it finishes.");
                }
                for (const id of STARTER_MODEL_IDS) {
                  const spec = ALL_MODELS.find((m) => m.id === id);
                  if (spec) void mgr.start(spec.id, spec.source.url, spec.filename, spec.source.bytes);
                }
                updateSettings({ onboarded: true });
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
                  {st && !ready
                    ? ` · ${st.state === "error" ? "failed" : st.state} ${formatBytes(st.received)}${st.total ? ` · ${pct}%` : ""}`
                    : ready
                      ? " · ready"
                      : " · not downloaded"}
                </div>
                {st?.error && <div className="pack-error">{downloadFailure(st.error)}</div>}
                {st && st.state === "downloading" && (
                  <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${pct}%` }} /></div>
                )}
              </div>
              {ready && !it.bundled ? (
                <button className="btn icon pack-get" title="Remove" onClick={() => void forgetPack(it.id)}>✓</button>
              ) : it.bundled ? (
                <span className="muted">✓</span>
              ) : (
                <button
                  className={st?.state === "error" ? "btn pack-retry" : "btn icon pack-get"}
                  title={st?.state === "error" ? "Retry download" : "Download"}
                  onClick={() => begin(it.id, it.url, it.filename, it.bytes)}
                >
                  {st?.state === "error" ? "Retry" : "+"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
