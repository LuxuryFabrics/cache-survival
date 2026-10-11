import { useEffect } from "react";
import { Sidebar, Tabbar } from "./components/Shell";
import { StatusPills } from "./components/StatusBar";
import { setOnline, useBoot, useCache } from "./hooks";
import { Chat } from "./screens/Chat";
import { Field } from "./screens/Field";
import { Files } from "./screens/Files";
import { Library } from "./screens/Library";
import { MapView } from "./screens/MapView";
import { More } from "./screens/More";
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
    <div className="app" data-screen={screen}>
      <Sidebar />
      <div className="main-col">
        <main className="workspace">
          <StatusPills />
          {!ready ? (
            <div className="card">Mounting local library and gazetteer…</div>
          ) : (
            <>
              {screen === "field" && <Field />}
              {screen === "chat" && <Chat />}
              {screen === "map" && <MapView />}
              {screen === "library" && <Library />}
              {screen === "vision" && <Vision />}
              {screen === "notes" && <Notes />}
              {screen === "files" && <Files />}
              {screen === "packs" && <Packs />}
              {screen === "settings" && <Settings />}
              {screen === "more" && <More />}
            </>
          )}
        </main>
        <Tabbar />
      </div>
    </div>
  );
}
