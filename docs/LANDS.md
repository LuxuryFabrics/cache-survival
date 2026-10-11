# Public vs private land (offline)

CACHE does **not** ship a cadastral / parcel layer. Those datasets are huge, often licensed, and still miss leases and posted signs. The offline map instead paints **known public land** and treats everything else as **private or unmapped**.

## What the bundled layer is

`apps/web/public/data/public-lands.geojson` (~6 MB), built by `python3 scripts/build_public_lands.py`.

| Kind | Source | Color |
| --- | --- | --- |
| BLM | [USA Federal Lands](https://www.arcgis.com/home/item.html?id=5e92f2e0930848faa40480bcb4fdc44e) (agency public data) | gold |
| Forest Service | same | green |
| National Park Service | same + [Natural Earth 10m parks](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/parks-and-protected-lands/) | dark green |
| Fish & Wildlife Service | federal lands | teal |
| Department of Defense | federal lands | gray |
| Bureau of Reclamation | federal lands | blue-gray |
| Uncolored land | — | cream = **private or unmapped** |

Units smaller than about **50 km²** are dropped so the file stays phone-friendly. Generalized vertices (~2 km). Public domain / US Government work + Natural Earth PD.

Tap a polygon: **Public · agency**. Tap cream land: **Private or unmapped**. “Ask AI about this location” includes that sentence.

Topographic relief, contour lines, streets, water, and buildings sit under this overlay. Relief is from Mapzen/AWS terrain tiles; streets from OpenFreeMap (OSM). Zoom a town to ~12+; use **Save this view** before locking the air-gap.

## What it is not

- Not county parcels or “who owns this lot.”
- Not complete PAD-US (state parks, state trust, local open space, tribal areas, easements, tiny federal scraps are often missing).
- Not permission to enter, camp, hunt, or drive.
- Not current fire closures or seasonal gates.

If a ranger, landowner, or posted sign disagrees with the color, they win.

## Better / larger open inventories

| Dataset | License | Notes |
| --- | --- | --- |
| **[PAD-US 4.1](https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-download)** (USGS) | Public domain | Best national inventory: federal + most state/local + some private conservation. GDB / state extracts. Has `Pub_Access` (open / restricted / closed). Too large to bundle whole. |
| **BLM Surface Management Agency** | Public domain | Western US “who manages the surface.” Uncolored ≈ non-federal. |
| **PAD-US 3.0 state GeoJSON** | Public domain | [ScienceBase](https://www.sciencebase.gov/catalog/item/622262f0d34ee0c6b38b6bd7) — drop a state file over `public-lands.geojson` if you need more detail. |
| **OpenStreetMap** `boundary=protected_area` | ODbL | Worldwide parks; ownership is incomplete. |
| **WDPA** | Restricted | World protected areas; not all uses are free. |
| Private parcel vendors (OnX, Regrid, county GIS) | Proprietary | Not used. |

To swap in a PAD-US extract, save GeoJSON with properties `name`, `agency`, `kind` (`blm|usfs|nps|fws|dod|bor|state|tribal|federal`), `tenure` (`public`), `access`, and point the MapLibre `lands` source at that file.

Rebuild the bundled layer:

```bash
python3 scripts/build_public_lands.py
```
