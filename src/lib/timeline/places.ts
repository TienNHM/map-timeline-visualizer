import { LatLng, TimelineSegment, Visit } from "./types";
import { isVisit, visitLabel } from "./stats";

export type PlaceCategory = "home" | "work" | "named" | "unknown";

export interface PlaceMarker {
  key: string;
  location: LatLng;
  label: string;
  category: PlaceCategory;
  visitCount: number;
  durationMs: number;
}

// ~111m at the equator — coarse enough that repeat visits to the same real-world spot
// (which never land on the exact same lat/lng twice) still cluster together, fine
// enough that genuinely distinct nearby places don't get merged.
const CLUSTER_PRECISION = 3;

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(CLUSTER_PRECISION)},${lng.toFixed(CLUSTER_PRECISION)}`;
}

export function categoryForVisit(v: Visit): PlaceCategory {
  const type = v.semanticType;
  if (type === "HOME" || type === "INFERRED_HOME") return "home";
  if (type === "WORK" || type === "INFERRED_WORK") return "work";
  if (v.placeName || v.address || (type && type !== "UNKNOWN")) return "named";
  return "unknown";
}

// Prefer a cluster's most specifically-identified visit as its representative label —
// e.g. if 9 unnamed pings and 1 confirmed "HOME" all cluster to the same spot (which
// happens: a low-confidence ping can land a few meters from a confirmed one), the place
// should read as "Home", not "Other place".
const CATEGORY_RANK: Record<PlaceCategory, number> = { home: 0, work: 1, named: 2, unknown: 3 };

interface Cluster {
  latSum: number;
  lngSum: number;
  count: number;
  durationMs: number;
  bestVisit: Visit;
  bestRank: number;
}

function durationMs(v: Visit): number {
  const ms = new Date(v.endTime).getTime() - new Date(v.startTime).getTime();
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

/**
 * Aggregates raw Visit segments into one marker per real-world place, clustered by
 * rounded coordinates (not by label — every unnamed "Other place" visit would otherwise
 * collapse into one marker regardless of where it actually happened). Each marker
 * carries the total visits/time spent there, for size-scaling the map pin.
 */
export function buildPlaceMarkers(segments: TimelineSegment[]): PlaceMarker[] {
  const clusters = new Map<string, Cluster>();

  for (const segment of segments) {
    if (!isVisit(segment)) continue;
    const key = coordKey(segment.location.lat, segment.location.lng);
    const rank = CATEGORY_RANK[categoryForVisit(segment)];

    let cluster = clusters.get(key);
    if (!cluster) {
      cluster = { latSum: 0, lngSum: 0, count: 0, durationMs: 0, bestVisit: segment, bestRank: rank };
      clusters.set(key, cluster);
    }
    cluster.latSum += segment.location.lat;
    cluster.lngSum += segment.location.lng;
    cluster.count += 1;
    cluster.durationMs += durationMs(segment);
    if (rank < cluster.bestRank) {
      cluster.bestVisit = segment;
      cluster.bestRank = rank;
    }
  }

  return Array.from(clusters.entries()).map(([key, c]) => ({
    key,
    location: { lat: c.latSum / c.count, lng: c.lngSum / c.count },
    label: visitLabel(c.bestVisit),
    category: categoryForVisit(c.bestVisit),
    visitCount: c.count,
    durationMs: c.durationMs,
  }));
}
