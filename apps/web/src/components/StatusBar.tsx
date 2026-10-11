import { airgap } from "@cache/core";
import { useSyncExternalStore } from "react";
import { activeModelLabel, useCache } from "../hooks";

function useAirgap() {
  return useSyncExternalStore(airgap.subscribeStore, airgap.getSnapshot, airgap.getSnapshot);
}

export function StatusPills() {
  const s = useCache();
  const gap = useAirgap();
  const model = activeModelLabel();
  const offline = gap.locked || !s.online;
  return (
    <div className="row" style={{ marginBottom: 18 }}>
      <span className={`badge ${offline ? "" : "warn"}`}>
        <span className={`dot ${offline ? "" : "off"}`} />
        {gap.locked ? "Air-gap" : s.online ? "Net open" : "Offline"}
      </span>
      <span className="badge quiet">{model}</span>
      {gap.debug && <span className="badge hot">Debug {gap.attempts.filter((a) => a.blocked).length}</span>}
      <span className="spacer" />
      <span className="muted">{s.statusLine}</span>
    </div>
  );
}
