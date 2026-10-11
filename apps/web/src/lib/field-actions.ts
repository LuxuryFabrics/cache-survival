import type { ExpertMode, GenerateOptions } from "@cache/core";

export interface FieldAction {
  id: string;
  label: string;
  blurb: string;
  expert: ExpertMode;
  prompt: string;
  wash: string;
}

/** One-tap briefs that produce an answer, not just a mode switch. */
export const FIELD_ACTIONS: FieldAction[] = [
  {
    id: "bleed",
    label: "Stop a bleed",
    blurb: "Tourniquet, pack, press",
    expert: "medic",
    wash: "g-rose",
    prompt:
      "Walk me through field control of life-threatening bleeding: tourniquet, wound packing, and direct pressure. Give the sequence, common mistakes, and when I must evacuate.",
  },
  {
    id: "water",
    label: "Make water safe",
    blurb: "Boil, filter, chemical",
    expert: "food-water",
    wash: "g-lemon",
    prompt:
      "How do I make surface water safe to drink in the field? Order of boil, filter, and chemical options, volumes, and what not to do.",
  },
  {
    id: "lost",
    label: "I'm lost",
    blurb: "STOP, stay, signal",
    expert: "survival",
    wash: "g-mint",
    prompt:
      "I think I am lost. Give the STOP method and what to do in the next hour without a GNSS fix. Include signaling and when to move.",
  },
  {
    id: "cold",
    label: "Getting cold",
    blurb: "Hypothermia, dry, cover",
    expert: "shelter",
    wash: "g-sky",
    prompt:
      "I am getting cold and wet. Hypothermia field care and the fastest shelter and fire steps with typical pocket kit.",
  },
  {
    id: "shelter",
    label: "Need shelter",
    blurb: "Site, hasty cover",
    expert: "shelter",
    wash: "g-sand",
    prompt:
      "How do I pick a site and build a hasty overnight shelter with what I likely have? Wind, water, and ground insulation first.",
  },
  {
    id: "here",
    label: "This location",
    blurb: "Terrain and hazards",
    expert: "navigation",
    wash: "g-ice",
    prompt:
      "What are the field considerations for this location? Terrain, climate, water, and common hazards. Use the coordinates if provided.",
  },
];

export const DESK_STARTERS: Record<ExpertMode, string> = {
  survival: "What should I do in the first hour if I am stranded overnight?",
  medic: "Walk me through MARCH for a field trauma casualty.",
  navigation: "How do I find my way without GNSS using terrain and a bearing?",
  "food-water": "How do I choose and treat a water source today?",
  shelter: "How do I build a hasty shelter before dark?",
  repair: "How do I field-fix a blown seam, snapped pole, or leaking bottle?",
  general: "Give me a short field priorities checklist I can run without a model.",
  creative: "Turn the STOP method into a 60-second drill I can teach someone else.",
};

export const FIRST_HOUR_DOCS = [
  {
    id: "priorities-rule-of-threes",
    label: "Rule of threes",
    blurb: "Air, exposure, water, food — in that order.",
  },
  {
    id: "stop-think-observe-plan",
    label: "STOP method",
    blurb: "Sit down. Think. Observe. Plan. Do not walk one more ridge.",
  },
] as const;

export function locationExtras(
  last?: { lat: number; lon: number; at?: number; source?: string } | null,
): Partial<GenerateOptions> | undefined {
  if (!last) return undefined;
  return { location: { lat: last.lat, lon: last.lon, label: "Last known" } };
}

export function formatAgo(at: number, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - at) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 36) return `${hr} h ago`;
  return new Date(at).toLocaleDateString();
}
