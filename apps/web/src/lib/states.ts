/** US state, DC, and Puerto Rico bounds for offline satellite packs.
 *  Alaska crosses the antimeridian, so its west longitude is greater than its east.
 */

export type StateBBox = { west: number; south: number; east: number; north: number };

export type UsState = {
  id: string;
  name: string;
  bbox: StateBBox;
};

export const US_STATES: readonly UsState[] = [
  { id: "AL", name: "Alabama", bbox: { west: -88.4712, south: 30.2471, east: -84.8891, north: 35.0012 } },
  { id: "AK", name: "Alaska", bbox: { west: 171.0950, south: 51.6127, east: -129.9863, north: 71.3517 } },
  { id: "AZ", name: "Arizona", bbox: { west: -114.8152, south: 31.3316, east: -109.0425, north: 37.0058 } },
  { id: "AR", name: "Arkansas", bbox: { west: -94.6163, south: 33.0020, east: -89.7308, north: 36.5019 } },
  { id: "CA", name: "California", bbox: { west: -124.4108, south: 32.5365, east: -114.1360, north: 42.0117 } },
  { id: "CO", name: "Colorado", bbox: { west: -109.0590, south: 36.9947, east: -102.0429, north: 41.0040 } },
  { id: "CT", name: "Connecticut", bbox: { west: -73.7272, south: 40.9874, east: -71.7993, north: 42.0501 } },
  { id: "DE", name: "Delaware", bbox: { west: -75.7866, south: 38.4516, east: -75.0471, north: 39.8319 } },
  { id: "DC", name: "District of Columbia", bbox: { west: -77.1175, south: 38.7912, east: -76.9092, north: 38.9939 } },
  { id: "FL", name: "Florida", bbox: { west: -87.6332, south: 25.1207, east: -80.0311, north: 31.0031 } },
  { id: "GA", name: "Georgia", bbox: { west: -85.6067, south: 30.3567, east: -80.8855, north: 35.0012 } },
  { id: "HI", name: "Hawaii", bbox: { west: -159.7645, south: 18.9482, east: -154.8078, north: 22.2290 } },
  { id: "ID", name: "Idaho", bbox: { west: -117.2415, south: 41.9952, east: -111.0470, north: 49.0003 } },
  { id: "IL", name: "Illinois", bbox: { west: -91.5054, south: 36.9838, east: -87.4962, north: 42.5101 } },
  { id: "IN", name: "Indiana", bbox: { west: -88.0604, south: 37.7889, east: -84.8015, north: 41.7598 } },
  { id: "IA", name: "Iowa", bbox: { west: -96.6318, south: 40.3795, east: -90.1415, north: 43.5014 } },
  { id: "KS", name: "Kansas", bbox: { west: -102.0540, south: 36.9947, east: -94.6107, north: 40.0017 } },
  { id: "KY", name: "Kentucky", bbox: { west: -89.4187, south: 36.4963, east: -81.9699, north: 39.1035 } },
  { id: "LA", name: "Louisiana", bbox: { west: -94.0412, south: 29.0094, east: -89.0023, north: 33.0186 } },
  { id: "ME", name: "Maine", bbox: { west: -71.0819, south: 43.0577, east: -66.9796, north: 47.4613 } },
  { id: "MD", name: "Maryland", bbox: { west: -79.4890, south: 37.9094, east: -75.0471, north: 39.7224 } },
  { id: "MA", name: "Massachusetts", bbox: { west: -73.5082, south: 41.4968, east: -69.9371, north: 42.8880 } },
  { id: "MI", name: "Michigan", bbox: { west: -90.4155, south: 41.6940, east: -82.4136, north: 48.1733 } },
  { id: "MN", name: "Minnesota", bbox: { west: -97.2288, south: 43.5013, east: -89.6157, north: 49.3837 } },
  { id: "MS", name: "Mississippi", bbox: { west: -91.6368, south: 30.1814, east: -88.0986, north: 34.9958 } },
  { id: "MO", name: "Missouri", bbox: { west: -95.7664, south: 35.9979, east: -89.1338, north: 40.6151 } },
  { id: "MT", name: "Montana", bbox: { west: -116.0476, south: 44.3941, east: -104.0420, north: 49.0003 } },
  { id: "NE", name: "Nebraska", bbox: { west: -104.0531, south: 40.0016, east: -95.3063, north: 43.0030 } },
  { id: "NV", name: "Nevada", bbox: { west: -120.0019, south: 35.0011, east: -114.0429, north: 42.0008 } },
  { id: "NH", name: "New Hampshire", bbox: { west: -72.5442, south: 42.6962, east: -70.7039, north: 45.3034 } },
  { id: "NJ", name: "New Jersey", bbox: { west: -75.5620, south: 38.9938, east: -73.9024, north: 41.3600 } },
  { id: "NM", name: "New Mexico", bbox: { west: -109.0480, south: 31.3316, east: -103.0014, north: 37.0003 } },
  { id: "NY", name: "New York", bbox: { west: -79.7628, south: 40.5438, east: -72.1005, north: 45.0186 } },
  { id: "NC", name: "North Carolina", bbox: { west: -84.3196, south: 33.8455, east: -75.7153, north: 36.5895 } },
  { id: "ND", name: "North Dakota", bbox: { west: -104.0476, south: 45.9331, east: -96.5605, north: 49.0003 } },
  { id: "OH", name: "Ohio", bbox: { west: -84.8180, south: 38.4242, east: -80.5185, north: 41.9789 } },
  { id: "OK", name: "Oklahoma", bbox: { west: -103.0015, south: 33.6374, east: -94.4300, north: 37.0003 } },
  { id: "OR", name: "Oregon", bbox: { west: -124.5532, south: 41.9897, east: -116.4637, north: 46.2618 } },
  { id: "PA", name: "Pennsylvania", bbox: { west: -80.5186, south: 39.7223, east: -74.6966, north: 42.2691 } },
  { id: "PR", name: "Puerto Rico", bbox: { west: -67.2699, south: 17.9295, east: -65.6267, north: 18.5156 } },
  { id: "RI", name: "Rhode Island", bbox: { west: -71.8596, south: 41.3215, east: -71.1201, north: 42.0172 } },
  { id: "SC", name: "South Carolina", bbox: { west: -83.3393, south: 32.0326, east: -78.5414, north: 35.1984 } },
  { id: "SD", name: "South Dakota", bbox: { west: -104.0585, south: 42.4881, east: -96.4345, north: 45.9442 } },
  { id: "TN", name: "Tennessee", bbox: { west: -90.3114, south: 34.9847, east: -81.6797, north: 36.6772 } },
  { id: "TX", name: "Texas", bbox: { west: -106.6437, south: 25.8875, east: -93.5263, north: 36.5019 } },
  { id: "UT", name: "Utah", bbox: { west: -114.0485, south: 37.0002, east: -109.0425, north: 42.0008 } },
  { id: "VT", name: "Vermont", bbox: { west: -73.4370, south: 42.7291, east: -71.4926, north: 45.0131 } },
  { id: "VA", name: "Virginia", bbox: { west: -83.6734, south: 36.5402, east: -75.2443, north: 39.4649 } },
  { id: "WA", name: "Washington", bbox: { west: -124.7066, south: 45.5497, east: -116.9183, north: 49.0003 } },
  { id: "WV", name: "West Virginia", bbox: { west: -82.6218, south: 37.2029, east: -77.7198, north: 40.6370 } },
  { id: "WI", name: "Wisconsin", bbox: { west: -92.8856, south: 42.4936, east: -87.0306, north: 46.9574 } },
  { id: "WY", name: "Wyoming", bbox: { west: -111.0526, south: 40.9984, east: -104.0530, north: 45.0021 } },
];

function bboxArea(bbox: StateBBox): number {
  const width = bbox.west <= bbox.east ? bbox.east - bbox.west : 360 - (bbox.west - bbox.east);
  return width * (bbox.north - bbox.south);
}

export function bboxContains(bbox: StateBBox, lon: number, lat: number): boolean {
  if (lat < bbox.south || lat > bbox.north) return false;
  const x = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (bbox.west <= bbox.east) return x >= bbox.west && x <= bbox.east;
  return x >= bbox.west || x <= bbox.east;
}

/** Smallest containing state wins, so the District of Columbia beats Maryland. */
export function stateAt(lat: number, lon: number): UsState | undefined {
  let best: UsState | undefined;
  let bestArea = Infinity;
  for (const state of US_STATES) {
    if (!bboxContains(state.bbox, lon, lat)) continue;
    const area = bboxArea(state.bbox);
    if (area < bestArea) {
      best = state;
      bestArea = area;
    }
  }
  return best;
}

export function stateById(id: string): UsState | undefined {
  return US_STATES.find((state) => state.id === id);
}

