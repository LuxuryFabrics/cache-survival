import { airgap } from "@cache/core";
import { useSyncExternalStore } from "react";
import { activeModelLabel, useCache } from "../hooks";

function useAirgap() {
  return useSyncExternalStore(airgap.subscribeStore, airgap.getSnapshot, airgap.getSnapshot);
}

export function StatusBar() {
  const s = useCache();
  const gap = useAirgap();
  const model = activeModelLabel();
  return (
    <header className="status">
      <h1>CACHE</h1>
      <span className={`badge ${s.online && !gap.locked ? "warn" : "live"}`}>
        <span className={`dot ${s.online && !gap.locked ? "off" : ""}`} />
        {gap.locked ? "AIR-GAP" : s.online ? "NET OPEN" : "OFFLINE"}
      </span>
      <span className="badge">{model}</span>
      {gap.debug && <span className="badge hot">DEBUG {gap.attempts.filter((a) => a.blocked).length} blocked</span>}
      <span className="spacer" />
      <span className="badge">{s.statusLine}</span>
    </header>
  );
}
