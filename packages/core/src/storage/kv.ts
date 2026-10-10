/** Minimal async KV used by the web/desktop/mobile hosts. */

export interface KvStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

export const KEYS = {
  conversations: "cache.conversations",
  places: "cache.savedPlaces",
  notes: "cache.notes",
  files: "cache.files",
  settings: "cache.settings",
  installs: "cache.installs",
  vaultCheck: "cache.vaultCheck",
  lastFix: "cache.lastFix",
  airgap: "cache.airgap",
} as const;

export interface AppSettings {
  expertMode: string;
  units: "km" | "mi";
  airgapLocked: boolean;
  airgapDebug: boolean;
  activeChatModel: string | null;
  activeWhisper: string | null;
  lastKnown?: { lat: number; lon: number; at: number; source: "gps" | "manual" | "map" };
  onboarded: boolean;
  highContrast: boolean;
}
