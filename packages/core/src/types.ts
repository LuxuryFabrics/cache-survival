/** Shared domain types for CACHE — the offline survival companion. */

export type ExpertMode =
  | "survival"
  | "medic"
  | "navigation"
  | "food-water"
  | "shelter"
  | "repair"
  | "general"
  | "creative";

export type LibraryCategory =
  | "medical"
  | "off-grid"
  | "food-water"
  | "shelter"
  | "fire"
  | "navigation"
  | "disaster"
  | "plants-animals"
  | "legal"
  | "signaling"
  | "hygiene"
  | "tools"
  | "climate"
  | "general";

export type PackKind = "model" | "whisper" | "vision" | "library" | "maps" | "gazetteer" | "field-id";

export type Quantization = "Q4_K_M" | "Q4_0" | "Q5_K_M" | "Q5_0" | "Q8_0" | "IQ4_XS";

export interface DownloadSource {
  /** Primary URL (Hugging Face resolve or direct). */
  url: string;
  /** Optional mirrors tried in order after the primary fails. */
  mirrors?: string[];
  /** Expected size in bytes when known. */
  bytes?: number;
  sha256?: string;
}

export interface ModelSpec {
  id: string;
  name: string;
  role: "chat" | "vision" | "whisper";
  description: string;
  params: string;
  quantization?: Quantization;
  context: number;
  recommended: boolean;
  /** Rough tokens/sec class on a mid-range phone with native llama.cpp. */
  speedClass: "fast" | "balanced" | "heavy";
  license: string;
  homepage: string;
  filename: string;
  source: DownloadSource;
  /** Optional multimodal projector for LLaVA-style models. */
  mmproj?: DownloadSource & { filename: string };
  minRamMb: number;
  diskMb: number;
}

export interface DataPackSpec {
  id: string;
  name: string;
  kind: PackKind;
  description: string;
  license: string;
  recommended: boolean;
  filename: string;
  source: DownloadSource;
  diskMb: number;
  region?: string;
}

export type InstallState = "missing" | "queued" | "downloading" | "paused" | "verifying" | "ready" | "error";

export interface InstallStatus {
  id: string;
  state: InstallState;
  received: number;
  total: number;
  error?: string;
  path?: string;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: number;
  citations?: Citation[];
  expertMode?: ExpertMode;
}

export interface Conversation {
  id: string;
  title: string;
  expertMode: ExpertMode;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Citation {
  documentId: string;
  title: string;
  category: LibraryCategory;
  source: string;
  license: string;
  excerpt: string;
  score: number;
}

export interface LibraryDocument {
  id: string;
  title: string;
  category: LibraryCategory;
  source: string;
  license: string;
  tags: string[];
  body: string;
  updatedAt: string;
}

export interface LibraryChunk {
  id: string;
  documentId: string;
  title: string;
  category: LibraryCategory;
  source: string;
  license: string;
  text: string;
  ordinal: number;
}

export interface Place {
  id: string;
  name: string;
  country: string;
  admin: string;
  lat: number;
  lon: number;
  population: number;
  featureClass: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  note?: string;
  createdAt: number;
}

export interface EncryptedNote {
  id: string;
  title: string;
  /** AES-256-GCM ciphertext as base64. */
  ciphertext: string;
  iv: string;
  salt: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserFile {
  id: string;
  name: string;
  mime: string;
  bytes: number;
  addedAt: number;
  textChars: number;
}

export interface GenerateOptions {
  expertMode: ExpertMode;
  maxTokens?: number;
  temperature?: number;
  location?: { lat: number; lon: number; label?: string };
  imageDescription?: string;
}

export interface GenerateResult {
  text: string;
  citations: Citation[];
  usedModel: string | null;
  fallback: boolean;
  tokens?: number;
}

export interface NetworkAttempt {
  at: number;
  method: string;
  url: string;
  blocked: boolean;
  source: string;
}

export interface StorageUsage {
  modelsMb: number;
  mapsMb: number;
  libraryMb: number;
  filesMb: number;
  notesMb: number;
  otherMb: number;
  totalMb: number;
}

export interface AirgapState {
  locked: boolean;
  debug: boolean;
  attempts: NetworkAttempt[];
}
