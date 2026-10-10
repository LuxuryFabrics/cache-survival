import { useEffect } from "react";
import { Nav, Tabbar } from "./components/Shell";
import { StatusBar } from "./components/StatusBar";
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

  if (!ready) {
    return (
      <div className="app">
        <StatusBar />
        <main className="main"><div className="card">Mounting local library and gazetteer…</div></main>
      </div>
    );
  }

  return (
    <div className="app">
      <StatusBar />
      <div className="shell">
        <Nav />
        <main className="main">
          {screen === "chat" && <Chat />}
          {screen === "map" && <MapView />}
          {screen === "library" && <Library />}
          {screen === "vision" && <Vision />}
          {screen === "notes" && <Notes />}
          {screen === "files" && <Files />}
          {screen === "packs" && <Packs />}
          {screen === "settings" && <Settings />}
        </main>
      </div>
      <Tabbar />
    </div>
  );
}
