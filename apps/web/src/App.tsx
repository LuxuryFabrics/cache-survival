import { useEffect } from "react";
import { Sidebar, Tabbar } from "./components/Shell";
import { StatusPills } from "./components/StatusBar";
import { setOnline, useBoot, useCache } from "./hooks";
import { Chat } from "./screens/Chat";
import { Files } from "./screens/Files";
import { Library } from "./screens/Library";
import { MapView } from "./screens/MapView";
import { Notes } from "./screens/Notes";
import { Packs } from "./screens/Packs";
import { Settings } from "./screens/Settings";
import { Vision } from "./screens/Vision";

export function App() {
  useBoot();
  const { ready, screen } = useCache();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <div className="app">
      <Sidebar />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        <main className="workspace">
          <StatusPills />
          {!ready ? (
            <div className="card">Mounting local library and gazetteer…</div>
          ) : (
            <>
              {screen === "chat" && <Chat />}
              {screen === "map" && <MapView />}
              {screen === "library" && <Library />}
              {screen === "vision" && <Vision />}
              {screen === "notes" && <Notes />}
              {screen === "files" && <Files />}
              {screen === "packs" && <Packs />}
              {screen === "settings" && <Settings />}
            </>
          )}
        </main>
        <Tabbar />
      </div>
    </div>
  );
}
