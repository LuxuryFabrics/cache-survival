#!/usr/bin/env python3
"""Build a compact offline public-lands layer (US federal + NPS).

Sources (all US Government / public domain derivatives):
  • Esri USA Federal Lands (BLM, USFS, NPS, FWS, DOD, Reclamation)
  • Natural Earth 10m US parks (named NPS units)

Uncolored land is NOT surveyed private parcels — it is “private or unmapped”
(state, local, tribal, and small federal fragments are often missing).
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

ESRI = "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Federal_Lands/FeatureServer/0/query"
NE_PARKS = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_parks_and_protected_lands_area.geojson"

AGENCY_KIND = {
    "Bureau of Land Management": "blm",
    "Forest Service": "usfs",
    "National Park Service": "nps",
    "Fish and Wildlife Service": "fws",
    "Department of Defense": "dod",
    "Bureau of Reclamation": "bor",
}


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "cache-survival/0.1"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def rings_to_geom(geom: dict | None) -> dict | None:
    if not geom:
        return None
    rings = geom.get("rings")
    if not rings:
        return None
    # Esri rings: first is outer, rest typically holes.
    if len(rings) == 1:
        return {"type": "Polygon", "coordinates": rings}
    return {"type": "Polygon", "coordinates": rings}


def fetch_federal(min_area: float = 50_000_000, offset_deg: float = 0.02) -> list[dict]:
    """Keep units ≥ ~10 km² and generalize vertices for a small offline file."""
    features: list[dict] = []
    offset = 0
    page = 2000
    where = f"Shape__Area>{int(min_area)}"
    while True:
        params = {
            "where": where,
            "outFields": "Agency,unit_name,Shape__Area",
            "f": "json",
            "outSR": "4326",
            "resultOffset": str(offset),
            "resultRecordCount": str(page),
            "maxAllowableOffset": str(offset_deg),
        }
        url = ESRI + "?" + urllib.parse.urlencode(params)
        print(f"Federal lands page offset={offset}")
        data = get_json(url)
        batch = data.get("features") or []
        for f in batch:
            attrs = f.get("attributes") or {}
            geom = rings_to_geom(f.get("geometry"))
            if not geom:
                continue
            agency = attrs.get("Agency") or "Federal"
            features.append({
                "type": "Feature",
                "properties": {
                    "name": attrs.get("unit_name") or agency,
                    "agency": agency,
                    "kind": AGENCY_KIND.get(agency, "federal"),
                    "tenure": "public",
                    "access": "check",
                    "source": "USA Federal Lands (public-domain agency data)",
                },
                "geometry": geom,
            })
        if len(batch) < page or not data.get("exceededTransferLimit"):
            if len(batch) < page:
                break
        offset += page
        if offset > 200_000:
            break
    print(f"Federal features kept: {len(features)}")
    return features


def fetch_ne_parks() -> list[dict]:
    print("Natural Earth parks…")
    try:
        data = get_json(NE_PARKS)
    except Exception as e:
        print(f"NE parks failed: {e}")
        return []
    out = []
    for f in data.get("features") or []:
        props = f.get("properties") or {}
        name = props.get("name") or props.get("unit_name") or props.get("NAME") or "National Park"
        out.append({
            "type": "Feature",
            "properties": {
                "name": name,
                "agency": "National Park Service",
                "kind": "nps",
                "tenure": "public",
                "access": "check",
                "source": "Natural Earth 10m parks (public domain)",
            },
            "geometry": f.get("geometry"),
        })
    print(f"NE parks: {len(out)}")
    return out


def main() -> None:
    feats = fetch_federal() + fetch_ne_parks()
    fc = {
        "type": "FeatureCollection",
        "name": "cache-public-lands",
        "attribution": "USGS / BLM / USFS / NPS / FWS / DOD / Natural Earth. Public domain. Not a cadastral survey.",
        "features": [f for f in feats if f.get("geometry")],
    }
    dest = OUT / "public-lands.geojson"
    dest.write_text(json.dumps(fc, separators=(",", ":")))
    print(f"Wrote {dest} ({dest.stat().st_size / 1024:.0f} KB, {len(fc['features'])} features)")


if __name__ == "__main__":
    main()
