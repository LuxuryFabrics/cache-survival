import {
  ALL_MODELS,
  KEYS,
  airgap,
  appendMessage,
  chunkAll,
  createConversation,
  encryptText,
  decryptText,
  exportConversationMarkdown,
  generateAnswer,
  getModel,
  type AppSettings,
  type Conversation,
  type EncryptedNote,
  type ExpertMode,
  type GenerateOptions,
  type InstallStatus,
  type LibraryChunk,
  type LibraryDocument,
  type Place,
  type SavedPlace,
  type UserFile,
} from "@cache/core";
import { kvGet, kvSet, estimateUsageMb, blobDel } from "../lib/idb";
import { createWllamaAdapter } from "../lib/wllama";

export type Screen =
  | "chat"
  | "map"
  | "library"
  | "vision"
  | "notes"
  | "files"
  | "packs"
  | "settings";

export interface RuntimeState {
  ready: boolean;
  screen: Screen;
  settings: AppSettings;
  conversations: Conversation[];
  activeConvoId: string | null;
  library: LibraryDocument[];
  chunks: LibraryChunk[];
  extraChunks: LibraryChunk[];
  places: Place[];
  savedPlaces: SavedPlace[];
  notes: EncryptedNote[];
  files: UserFile[];
  installs: Record<string, InstallStatus>;
  online: boolean;
  busy: boolean;
  statusLine: string;
  vaultUnlocked: boolean;
  vaultPassword: string;
  usage: { usedMb: number; quotaMb: number };
}

const defaultSettings = (): AppSettings => ({
  expertMode: "survival",
  units: "mi",
  airgapLocked: false,
  airgapDebug: false,
  activeChatModel: null,
  activeWhisper: null,
  onboarded: false,
  highContrast: false,
});

let state: RuntimeState = {
  ready: false,
  screen: "chat",
  settings: defaultSettings(),
  conversations: [],
  activeConvoId: null,
  library: [],
  chunks: [],
  extraChunks: [],
  places: [],
  savedPlaces: [],
  notes: [],
  files: [],
  installs: {},
  online: typeof navigator !== "undefined" ? navigator.onLine : false,
  busy: false,
  statusLine: "Loading local data…",
  vaultUnlocked: false,
  vaultPassword: "",
  usage: { usedMb: 0, quotaMb: 0 },
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function patch(partial: Partial<RuntimeState>): void {
  state = { ...state, ...partial };
  emit();
}

export function getState(): RuntimeState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function persist(): Promise<void> {
  await kvSet(KEYS.conversations, state.conversations);
  await kvSet(KEYS.places, state.savedPlaces);
  await kvSet(KEYS.notes, state.notes);
  await kvSet(KEYS.files, state.files);
  await kvSet(KEYS.settings, state.settings);
  await kvSet(KEYS.installs, state.installs);
}

export async function boot(): Promise<void> {
  const [settings, convos, saved, notes, files, installs, lib, places] = await Promise.all([
    kvGet<AppSettings>(KEYS.settings),
    kvGet<Conversation[]>(KEYS.conversations),
    kvGet<SavedPlace[]>(KEYS.places),
    kvGet<EncryptedNote[]>(KEYS.notes),
    kvGet<UserFile[]>(KEYS.files),
    kvGet<Record<string, InstallStatus>>(KEYS.installs),
    fetch("/data/library-seed.json").then((r) => r.json()) as Promise<LibraryDocument[]>,
    fetch("/data/places.json").then((r) => r.json()) as Promise<Place[]>,
  ]);

  const nextSettings = { ...defaultSettings(), ...settings };
  if (nextSettings.airgapLocked) airgap.lock();
  airgap.setDebug(nextSettings.airgapDebug);
  if (nextSettings.highContrast) document.documentElement.dataset.contrast = "high";

  const conversations = convos?.length ? convos : [createConversation("survival", "Field brief")];
  const usage = await estimateUsageMb();

  patch({
    ready: true,
    settings: nextSettings,
    conversations,
    activeConvoId: conversations[0].id,
    library: lib,
    chunks: chunkAll(lib),
    places,
    savedPlaces: saved ?? [],
    notes: notes ?? [],
    files: files ?? [],
    installs: installs ?? {},
    usage,
    statusLine: `${lib.length} manuals · ${places.length.toLocaleString()} places · local`,
    screen: nextSettings.onboarded ? "chat" : "packs",
  });
}

export function setScreen(screen: Screen): void {
  patch({ screen });
}

export function setExpert(mode: ExpertMode): void {
  const settings = { ...state.settings, expertMode: mode };
  const active = state.conversations.find((c) => c.id === state.activeConvoId);
  const conversations = active
    ? state.conversations.map((c) => (c.id === active.id ? { ...c, expertMode: mode } : c))
    : state.conversations;
  patch({ settings, conversations });
  void persist();
}

export function newChat(): void {
  const convo = createConversation(state.settings.expertMode as ExpertMode);
  patch({ conversations: [convo, ...state.conversations], activeConvoId: convo.id, screen: "chat" });
  void persist();
}

export function selectChat(id: string): void {
  patch({ activeConvoId: id, screen: "chat" });
}

export async function sendPrompt(text: string, extras?: Partial<GenerateOptions>): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || state.busy) return;
  let convo = state.conversations.find((c) => c.id === state.activeConvoId);
  if (!convo) {
    convo = createConversation(state.settings.expertMode as ExpertMode);
    patch({ conversations: [convo, ...state.conversations], activeConvoId: convo.id });
  }
  const mode = (extras?.expertMode ?? convo.expertMode) as ExpertMode;
  convo = appendMessage(convo, { role: "user", content: trimmed, expertMode: mode });
  writeConvo(convo);
  patch({ busy: true, statusLine: "Thinking from local sources…" });

  const modelId = state.settings.activeChatModel;
  const spec = modelId ? getModel(modelId) : undefined;
  const llm = spec ? await createWllamaAdapter(spec.id, spec.filename) : null;
  const userChunks = state.extraChunks.map((c) => ({
    ...c,
    category: "general" as const,
    source: "Your Files",
    license: "user",
  }));

  try {
    const result = await generateAnswer(trimmed, { expertMode: mode, ...extras }, {
      llm,
      chunks: () => [...state.chunks, ...userChunks],
    });
    convo = appendMessage(
      state.conversations.find((c) => c.id === convo!.id) ?? convo,
      { role: "assistant", content: result.text, citations: result.citations, expertMode: mode },
    );
    writeConvo(convo);
    patch({
      busy: false,
      statusLine: result.fallback
        ? "Extractive library answer · no chat model loaded"
        : `Local model ${result.usedModel}`,
    });
  } catch (err) {
    convo = appendMessage(state.conversations.find((c) => c.id === convo!.id) ?? convo, {
      role: "assistant",
      content: `Local inference failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    writeConvo(convo);
    patch({ busy: false, statusLine: "Inference error" });
  }
  await persist();
}

function writeConvo(convo: Conversation): void {
  patch({ conversations: state.conversations.map((c) => (c.id === convo.id ? convo : c)) });
}

export function savePlace(place: SavedPlace): void {
  patch({ savedPlaces: [place, ...state.savedPlaces.filter((p) => p.id !== place.id)] });
  void persist();
}

export function deletePlace(id: string): void {
  patch({ savedPlaces: state.savedPlaces.filter((p) => p.id !== id) });
  void persist();
}

export async function addNote(title: string, body: string, password: string): Promise<void> {
  const enc = await encryptText(body, password);
  const now = Date.now();
  const note: EncryptedNote = { id: `note_${now}`, title, ...enc, createdAt: now, updatedAt: now };
  patch({ notes: [note, ...state.notes], vaultUnlocked: true, vaultPassword: password });
  await persist();
}

export async function readNote(note: EncryptedNote, password: string): Promise<string> {
  const text = await decryptText(note, password);
  patch({ vaultUnlocked: true, vaultPassword: password });
  return text;
}

export function deleteNote(id: string): void {
  patch({ notes: state.notes.filter((n) => n.id !== id) });
  void persist();
}

export function addFileMeta(file: UserFile, chunks: LibraryChunk[]): void {
  patch({ files: [file, ...state.files], extraChunks: [...state.extraChunks, ...chunks] });
  void persist();
}

export function deleteFile(id: string): void {
  patch({
    files: state.files.filter((f) => f.id !== id),
    extraChunks: state.extraChunks.filter((c) => c.documentId !== id),
  });
  void persist();
}

export function updateSettings(partial: Partial<AppSettings>): void {
  const settings = { ...state.settings, ...partial };
  if (partial.airgapLocked) airgap.lock();
  if (partial.airgapLocked === false) airgap.unlock();
  if (partial.airgapDebug !== undefined) airgap.setDebug(partial.airgapDebug);
  if (partial.highContrast !== undefined) {
    document.documentElement.dataset.contrast = partial.highContrast ? "high" : "";
  }
  patch({ settings });
  void persist();
}

export function markOnboarded(): void {
  updateSettings({ onboarded: true });
  patch({ screen: "chat" });
}

export function setInstall(status: InstallStatus): void {
  const installs = { ...state.installs, [status.id]: status };
  const spec = getModel(status.id);
  const settings =
    status.state === "ready" && spec?.role === "chat"
      ? { ...state.settings, activeChatModel: status.id }
      : state.settings;
  patch({ installs, settings });
  void persist();
}

export async function forgetPack(id: string): Promise<void> {
  const spec = ALL_MODELS.find((m) => m.id === id);
  if (spec) await blobDel(`file:${spec.filename}`).catch(() => undefined);
  const installs = { ...state.installs };
  delete installs[id];
  const settings =
    state.settings.activeChatModel === id ? { ...state.settings, activeChatModel: null } : state.settings;
  patch({ installs, settings });
  await persist();
}

export function exportActiveChat(): string {
  const convo = state.conversations.find((c) => c.id === state.activeConvoId);
  return convo ? exportConversationMarkdown(convo) : "";
}

export function setOnline(online: boolean): void {
  patch({ online });
}

export function activeModelLabel(): string {
  const id = state.settings.activeChatModel;
  if (!id) return "No LLM · library only";
  const ready = state.installs[id]?.state === "ready";
  const spec = getModel(id);
  return ready ? spec?.name ?? id : `${spec?.name ?? id} (not ready)`;
}
