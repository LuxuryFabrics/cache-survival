import { airgap, formatBytes } from "@cache/core";
import { useSyncExternalStore } from "react";
import { MobileBack } from "../components/Shell";
import { setScreen, updateSettings, useCache } from "../hooks";

export function Settings() {
  const s = useCache();
  const gap = useSyncExternalStore(airgap.subscribeStore, airgap.getSnapshot, airgap.getSnapshot);

  return (
    <div className="stack">
      <MobileBack />
      <div className="page-head">
        <p className="kicker">Local only</p>
        <h2>Settings</h2>
      </div>
      <div className="grid-2">
        <div className="card stack">
          <h3>Air-gap</h3>
          <p>After packs are on disk, lock the network. Chat, maps, library, notes, and vision must not call home.</p>
          <label className="row">
            Lock air-gap
            <span className="spacer" />
            <input
              className="toggle"
              type="checkbox"
              checked={s.settings.airgapLocked}
              onChange={(e) => updateSettings({ airgapLocked: e.target.checked })}
            />
          </label>
          <label className="row">
            Debug blocked requests
            <span className="spacer" />
            <input
              className="toggle"
              type="checkbox"
              checked={s.settings.airgapDebug}
              onChange={(e) => updateSettings({ airgapDebug: e.target.checked })}
            />
          </label>
          {gap.attempts.slice(-8).reverse().map((a, i) => (
            <div key={i} className="mono">
              {a.blocked ? "BLOCK" : "allow"} {a.method} {a.url.slice(0, 80)}
            </div>
          ))}
        </div>
        <div className="card stack">
          <h3>Display & units</h3>
          <label className="row">
            High contrast
            <span className="spacer" />
            <input
              className="toggle"
              type="checkbox"
              checked={s.settings.highContrast}
              onChange={(e) => updateSettings({ highContrast: e.target.checked })}
            />
          </label>
          <div className="row">
            <button className="btn" onClick={() => updateSettings({ units: "mi" })}>Miles</button>
            <button className="btn" onClick={() => updateSettings({ units: "km" })}>Kilometers</button>
          </div>
          <h3>Storage</h3>
          <p className="mono">
            Used {s.usage.usedMb.toFixed(1)} MB
            {s.usage.quotaMb ? ` / ${s.usage.quotaMb.toFixed(0)} MB quota` : ""}
          </p>
          <p className="muted">Delete models and map packs under Packs to reclaim space. Notes stay until you delete them.</p>
          <button className="btn" onClick={() => setScreen("packs")}>Open pack manager</button>
        </div>
      </div>
      <div className="card stack">
        <h3>What this app will never do</h3>
        <p>
          No accounts, no telemetry, no USB dongle, no subscription. After the optional Hugging Face downloads,
          CACHE is meant to live in airplane mode, tunnels, and dead valleys. Government manuals here are shortened
          public-domain adaptations and can be outdated — official publications win.
        </p>
        <p className="mono">CACHE {formatBytes(0)} · MIT · llama.cpp / MapLibre / whisper.cpp / SQLite-ready core</p>
      </div>
    </div>
  );
}
