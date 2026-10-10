import type { Citation, ExpertMode, GenerateOptions, GenerateResult, LibraryChunk } from "../types.js";
import { expertPrompt } from "./experts.js";
import { retrieve } from "../rag/retrieve.js";

export interface LlmAdapter {
  id: string;
  ready: boolean;
  generate(prompt: string, options: { maxTokens: number; temperature: number }): Promise<string>;
}

export interface EngineDeps {
  llm: LlmAdapter | null;
  chunks: () => LibraryChunk[];
}

const SAFETY =
  "Field guidance only — not a substitute for licensed medical care, rescue services, or formal training. When in doubt, do not eat, do not drink untreated water, and treat unknown plants as toxic.";

export function buildPrompt(
  user: string,
  mode: ExpertMode,
  citations: Citation[],
  extras?: { location?: GenerateOptions["location"]; imageDescription?: string },
): string {
  const sources =
    citations.length === 0
      ? "(no local library hits — say so and stay conservative)"
      : citations
          .map((c, i) => `[${i + 1}] ${c.title} — ${c.source}\n${c.excerpt}`)
          .join("\n\n");

  const loc = extras?.location
    ? `Location context: ${extras.location.label ?? "coordinates"} (${extras.location.lat.toFixed(4)}, ${extras.location.lon.toFixed(4)})`
    : "";
  const img = extras?.imageDescription ? `Image analysis: ${extras.imageDescription}` : "";

  return `${expertPrompt(mode)}

${SAFETY}

Local library excerpts (cite by number when you use them):
${sources}

${loc}
${img}

User: ${user}
Assistant:`;
}

export function fallbackAnswer(user: string, citations: Citation[], mode: ExpertMode): string {
  if (citations.length === 0) {
    return [
      `No local model is loaded and the library had no close match for “${user.trim()}”.`,
      "",
      "What you can do now:",
      "• Open Packs and download a small chat model (SmolLM2 360M or Llama 3.2 1B).",
      "• Search the Survival Library with a simpler keyword (water, bleed, shelter, bearing).",
      "• Import a PDF under Files if the answer lives in your own manuals.",
      "",
      SAFETY,
      "",
      `Expert desk: ${mode}.`,
    ].join("\n");
  }

  const blocks = citations.map((c, i) => {
    return `### [${i + 1}] ${c.title}\n_${c.source} · ${c.license}_\n\n${c.excerpt}`;
  });

  return [
    "Local model not loaded — answering from the on-device library (extractive).",
    "",
    ...blocks,
    "",
    SAFETY,
  ].join("\n");
}

export async function generateAnswer(
  user: string,
  options: GenerateOptions,
  deps: EngineDeps,
): Promise<GenerateResult> {
  const citations = retrieve({
    query: user,
    expertMode: options.expertMode,
    chunks: deps.chunks(),
    limit: 4,
  });

  const llm = deps.llm;
  if (!llm?.ready) {
    return {
      text: fallbackAnswer(user, citations, options.expertMode),
      citations,
      usedModel: null,
      fallback: true,
    };
  }

  const prompt = buildPrompt(user, options.expertMode, citations, {
    location: options.location,
    imageDescription: options.imageDescription,
  });

  const text = await llm.generate(prompt, {
    maxTokens: options.maxTokens ?? 384,
    temperature: options.temperature ?? 0.4,
  });

  return {
    text: text.trim() || fallbackAnswer(user, citations, options.expertMode),
    citations,
    usedModel: llm.id,
    fallback: false,
  };
}
