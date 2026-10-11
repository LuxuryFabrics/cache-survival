export type LandTenure = "public" | "private-or-unmapped";

export type LandKind = "blm" | "usfs" | "nps" | "fws" | "dod" | "bor" | "federal" | "state" | "tribal" | "unknown";

export interface LandHit {
  tenure: LandTenure;
  name: string;
  agency: string;
  kind: LandKind;
  access: string;
  source: string;
}

export const LAND_KIND_LABEL: Record<LandKind, string> = {
  blm: "BLM",
  usfs: "National Forest / Grassland",
  nps: "National Park Service",
  fws: "Fish & Wildlife Service",
  dod: "Department of Defense",
  bor: "Bureau of Reclamation",
  federal: "Federal",
  state: "State",
  tribal: "Tribal",
  unknown: "Unknown",
};

export function describeLand(hit: LandHit | null): string {
  if (!hit || hit.tenure === "private-or-unmapped") {
    return "Private or unmapped — not in the offline federal public-lands layer. Could still be state, local, tribal, or a small public unit. Not a survey; do not treat as permission to enter.";
  }
  const kind = LAND_KIND_LABEL[hit.kind] ?? hit.agency;
  return `Public (federal layer): ${hit.name} · ${kind}. Access rules vary (open, permit, seasonal, closed). Confirm on the ground. Not a cadastral survey.`;
}

export function landFromProperties(props: Record<string, unknown> | null | undefined): LandHit | null {
  if (!props) return null;
  const tenure = props.tenure === "public" ? "public" : "private-or-unmapped";
  if (tenure !== "public") return null;
  return {
    tenure,
    name: String(props.name ?? "Public land"),
    agency: String(props.agency ?? "Federal"),
    kind: (String(props.kind ?? "federal") as LandKind),
    access: String(props.access ?? "check"),
    source: String(props.source ?? "PAD-US / federal lands"),
  };
}
