import { TimelineData, TimelineSegment, Trip, Visit } from "./types";

export interface TimelineStats {
  totalDistanceMeters: number;
  distanceByActivity: Record<string, number>;
  placeVisitCounts: Array<{ label: string; count: number }>;
  tripCount: number;
  visitCount: number;
  earliestTime: string | null;
  latestTime: string | null;
}

/** Google reports an inferred guess ("INFERRED_HOME") separately from a confirmed one
 * ("HOME"), but they mean the same place to a user — grouping/labeling should treat
 * them as one, not split a place's visits into two "different" entries. */
const SEMANTIC_TYPE_ALIASES: Record<string, string> = {
  INFERRED_HOME: "HOME",
  INFERRED_WORK: "WORK",
};

export function visitLabel(v: Visit): string {
  if (v.placeName) return v.placeName;
  if (v.semanticType) return SEMANTIC_TYPE_ALIASES[v.semanticType] ?? v.semanticType;
  return v.address ?? `${v.location.lat.toFixed(3)}, ${v.location.lng.toFixed(3)}`;
}

export function computeStats(data: TimelineData): TimelineStats {
  let totalDistanceMeters = 0;
  const distanceByActivity: Record<string, number> = {};
  const placeCounts = new Map<string, number>();
  let tripCount = 0;
  let visitCount = 0;
  let earliestTime: string | null = null;
  let latestTime: string | null = null;

  for (const segment of data.segments) {
    trackTimeRange(segment);

    if (segment.type === "trip") {
      tripCount += 1;
      const distance = segment.distanceMeters ?? 0;
      totalDistanceMeters += distance;
      const activity = segment.activityType ?? "UNKNOWN";
      distanceByActivity[activity] = (distanceByActivity[activity] ?? 0) + distance;
    } else {
      visitCount += 1;
      const label = visitLabel(segment);
      placeCounts.set(label, (placeCounts.get(label) ?? 0) + 1);
    }
  }

  function trackTimeRange(segment: TimelineSegment) {
    if (!earliestTime || segment.startTime < earliestTime) earliestTime = segment.startTime;
    if (!latestTime || segment.endTime > latestTime) latestTime = segment.endTime;
  }

  const placeVisitCounts = Array.from(placeCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalDistanceMeters,
    distanceByActivity,
    placeVisitCounts,
    tripCount,
    visitCount,
    earliestTime,
    latestTime,
  };
}

export function segmentsWithinRange(
  segments: TimelineSegment[],
  startTime: string,
  endTime: string
): TimelineSegment[] {
  return segments.filter((s) => s.startTime <= endTime && s.endTime >= startTime);
}

export function isTrip(segment: TimelineSegment): segment is Trip {
  return segment.type === "trip";
}

export function isVisit(segment: TimelineSegment): segment is Visit {
  return segment.type === "visit";
}
