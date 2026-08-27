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
  firstVisitTime: string;
  lastVisitTime: string;
}

const METERS_PER_DEGREE = 111320;

/** Default clustering radius when there's no accuracy limit to derive one from. */
const DEFAULT_CLUSTER_RADIUS_METERS = 100;
/** However loose the accuracy limit gets, still keep genuinely distinct neighborhoods
 * from collapsing into one marker. */
const MAX_CLUSTER_RADIUS_METERS = 1500;
const MIN_CLUSTER_RADIUS_METERS = 30;

/**
 * The GPS accuracy limit (see AccuracyFilter) is also the best available signal for how
 * far apart two pings can land while still describing the same real-world visit — a
 * looser limit means noisier location data, so place markers should cluster more
 * aggressively too, or the map fills up with near-duplicate pins for one place (a
 * "Home" with a 1000m accuracy limit can easily report a dozen slightly different
 * coordinates). Re-clustering at this radius each time the limit changes is what
 * actually reduces that noise, rather than just filtering points that were never
 * feeding the marker count in the first place (Visit points carry no per-point
 * accuracy reading to filter by, unlike Trip paths).
 */
export function clusterRadiusForAccuracyLimit(limitMeters: number | null): number {
  if (limitMeters === null) return DEFAULT_CLUSTER_RADIUS_METERS;
  return Math.min(MAX_CLUSTER_RADIUS_METERS, Math.max(MIN_CLUSTER_RADIUS_METERS, limitMeters));
}

export function placeCoordKey(lat: number, lng: number, radiusMeters: number): string {
  const cellDeg = radiusMeters / METERS_PER_DEGREE;
  const latCell = Math.round(lat / cellDeg);
  const lngCell = Math.round(lng / cellDeg);
  return `${latCell},${lngCell}`;
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
  firstVisitTime: string;
  lastVisitTime: string;
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
export function buildPlaceMarkers(
  segments: TimelineSegment[],
  clusterRadiusMeters: number = DEFAULT_CLUSTER_RADIUS_METERS
): PlaceMarker[] {
  const clusters = new Map<string, Cluster>();

  for (const segment of segments) {
    if (!isVisit(segment)) continue;
    const key = placeCoordKey(segment.location.lat, segment.location.lng, clusterRadiusMeters);
    const rank = CATEGORY_RANK[categoryForVisit(segment)];

    let cluster = clusters.get(key);
    if (!cluster) {
      cluster = {
        latSum: 0,
        lngSum: 0,
        count: 0,
        durationMs: 0,
        bestVisit: segment,
        bestRank: rank,
        firstVisitTime: segment.startTime,
        lastVisitTime: segment.startTime,
      };
      clusters.set(key, cluster);
    }
    cluster.latSum += segment.location.lat;
    cluster.lngSum += segment.location.lng;
    cluster.count += 1;
    cluster.durationMs += durationMs(segment);
    if (segment.startTime < cluster.firstVisitTime) cluster.firstVisitTime = segment.startTime;
    if (segment.startTime > cluster.lastVisitTime) cluster.lastVisitTime = segment.startTime;
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
    firstVisitTime: c.firstVisitTime,
    lastVisitTime: c.lastVisitTime,
  }));
}

/**
 * The individual Visit occurrences behind one place marker, newest first — computed on
 * demand (rather than carried on every PlaceMarker) since most consumers only need this
 * for whichever single place a user has expanded/clicked, not for the whole list.
 */
export function placeVisits(segments: TimelineSegment[], key: string, clusterRadiusMeters: number): Visit[] {
  return segments
    .filter(isVisit)
    .filter((v) => placeCoordKey(v.location.lat, v.location.lng, clusterRadiusMeters) === key)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}
