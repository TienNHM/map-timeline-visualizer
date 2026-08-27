import { LatLng, TimelineSegment, TrackPoint, Visit } from "./types";
import { isTrip, isVisit, visitLabel } from "./stats";

export type TripSortKey = "date-desc" | "date-asc" | "distance-desc";

export interface TripSummary {
  id: string;
  /** 1-based order within the chronological trip sequence of the given segments. */
  index: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  distanceMeters: number;
  activityType?: string;
  /** The place the trip left from — the nearest adjoining visit's label, or a
   * coordinate string if no visit directly precedes it. */
  startLabel: string;
  /** Same as startLabel, for where the trip arrived. */
  endLabel: string;
  startLocation: LatLng;
  endLocation: LatLng;
  path: TrackPoint[];
}

function coordLabel(p: LatLng): string {
  return `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`;
}

function labelForAdjoiningVisit(v: Visit): string {
  return visitLabel(v);
}

/**
 * Groups the raw trip/visit segments into a display-friendly list of trips, each
 * labeled with where it started and ended. A trip's endpoint label comes from the
 * nearest visit directly adjoining it in time — if two trips are adjacent with no
 * visit between them (a gap in the semantic data), the label falls back to raw
 * coordinates rather than guessing a name from an unrelated, more distant visit.
 */
export function buildTripSummaries(segments: TimelineSegment[]): TripSummary[] {
  const sorted = [...segments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const summaries: TripSummary[] = [];
  let index = 0;

  sorted.forEach((segment, i) => {
    if (!isTrip(segment)) return;
    index += 1;

    let startLabel = coordLabel(segment.startLocation);
    for (let j = i - 1; j >= 0; j--) {
      const prev = sorted[j];
      if (isVisit(prev)) {
        startLabel = labelForAdjoiningVisit(prev);
        break;
      }
      if (isTrip(prev)) break;
    }

    let endLabel = coordLabel(segment.endLocation);
    for (let j = i + 1; j < sorted.length; j++) {
      const next = sorted[j];
      if (isVisit(next)) {
        endLabel = labelForAdjoiningVisit(next);
        break;
      }
      if (isTrip(next)) break;
    }

    const durationMs = Math.max(0, new Date(segment.endTime).getTime() - new Date(segment.startTime).getTime());

    summaries.push({
      id: segment.id,
      index,
      startTime: segment.startTime,
      endTime: segment.endTime,
      durationMs,
      distanceMeters: segment.distanceMeters ?? 0,
      activityType: segment.activityType,
      startLabel,
      endLabel,
      startLocation: segment.startLocation,
      endLocation: segment.endLocation,
      path: segment.path,
    });
  });

  return summaries;
}
