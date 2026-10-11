import { airgap } from "@cache/core";
import { useSyncExternalStore } from "react";
import { activeModelLabel, setScreen, useCache } from "../hooks";

function useAirgap() {
  return useSyncExternalStore(airgap.subscribeStore, airgap.getSnapshot, airgap.getSnapshot);
}

export function StatusPills() {
  const s = useCache();
  const gap = useAirgap();
  const model = activeModelLabel();
  const offline = gap.locked || !s.online;
  const last = s.settings.lastKnown;
  return (
    <div className="row status-row">
      <span className={`badge ${offline ? "" : "warn"}`}>
        <span className={`dot ${offline ? "" : "off"}`} />
        {gap.locked ? "Air-gap" : s.online ? "Net open" : "Offline"}
      </span>
      <span className="badge quiet model-pill">{model}</span>
      {last ? (
        <button className="badge quiet loc-chip" onClick={() => setScreen("map")} title="Open last pin on the map">
          {last.lat.toFixed(2)}, {last.lon.toFixed(2)}
        </button>
      ) : (
        <button className="badge quiet loc-chip" onClick={() => setScreen("map")}>
          No pin
        </button>
      )}
      {gap.debug && <span className="badge hot">Debug {gap.attempts.filter((a) => a.blocked).length}</span>}
      <span className="spacer" />
      <span className="muted status-detail">{s.statusLine}</span>
    </div>
  );
}
