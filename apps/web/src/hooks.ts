import { useEffect, useSyncExternalStore } from "react";
import { boot, getState, subscribe } from "./store/app-store";

export function useCache() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useBoot() {
  useEffect(() => {
    void boot();
  }, []);
}

export {
  activeModelLabel,
  addFileMeta,
  addNote,
  deleteFile,
  deleteNote,
  deletePlace,
  exportActiveChat,
  forgetPack,
  markOnboarded,
  newChat,
  readNote,
  savePlace,
  selectChat,
  sendPrompt,
  setExpert,
  setInstall,
  setOnline,
  setScreen,
  updateSettings,
} from "./store/app-store";
