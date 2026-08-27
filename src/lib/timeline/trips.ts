import { LatLng, TimelineSegment, TrackPoint, Trip, Visit } from "./types";
import { isTrip, isVisit, visitLabel } from "./stats";

export type TripSortKey = "date-desc" | "date-asc" | "distance-desc";

export interface TripSummary {
  /** The first merged leg's raw segment id — stable and unique enough to key/select by. */
  id: string;
  /** Every raw Trip segment id merged into this trip, in order — lets a consumer (e.g.
   * isolating this trip on the map) pull all of its legs, not just the first. */
  legIds: string[];
  /** 1-based order within the chronological trip sequence of the given segments. */
  index: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  distanceMeters: number;
  /** The activity covering the most distance across the trip's merged legs. */
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

// Consecutive Trip segments this close together (in wall-clock time, not distance) are
// treated as one continuous outing rather than separate trips — a red light, a brief
// shop stop, or an activity-type change (walk -> motorcycle) mid-errand all fragment
// Google's own semantic data into several short Trip segments a few minutes apart, and
// showing each as its own "trip" reads as noise rather than the actual journey. A
// longer gap (a real stop — arriving home, at work, at a restaurant) still splits trips
// as expected, since that's a deliberate destination, not an artifact of the data.
const MERGE_GAP_MS = 20 * 60 * 1000;

interface TripGroup {
  legs: Trip[];
  /** Index into the chronological `sorted` array — used to look either side of the
   * group (not just the group's own legs) for an adjoining visit's label. */
  firstIndex: number;
  lastIndex: number;
}

function coordLabel(p: LatLng): string {
  return `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`;
}

function labelForAdjoiningVisit(v: Visit): string {
  return visitLabel(v);
}

function dominantActivity(legs: Trip[]): string | undefined {
  const distanceByActivity = new Map<string, number>();
  for (const leg of legs) {
    const activity = leg.activityType ?? "UNKNOWN";
    distanceByActivity.set(activity, (distanceByActivity.get(activity) ?? 0) + (leg.distanceMeters ?? 0));
  }
  let best: string | undefined;
  let bestDistance = -1;
  for (const [activity, distance] of distanceByActivity) {
    if (distance > bestDistance) {
      best = activity;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Groups the raw trip/visit segments into a display-friendly list of trips: consecutive
 * Trip legs separated by no more than MERGE_GAP_MS are merged into one, and each is
 * labeled with where it started and ended. A trip's endpoint label comes from the
 * nearest visit directly adjoining the merged group — if there's no visit between it
 * and the next/previous trip (a gap in the semantic data), the label falls back to raw
 * coordinates rather than guessing a name from an unrelated, more distant visit.
 */
export function buildTripSummaries(segments: TimelineSegment[]): TripSummary[] {
  const sorted = [...segments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const groups: TripGroup[] = [];

  sorted.forEach((segment, i) => {
    if (!isTrip(segment)) return;

    const lastGroup = groups[groups.length - 1];
    const lastLeg = lastGroup?.legs[lastGroup.legs.length - 1];
    const gapMs = lastLeg ? new Date(segment.startTime).getTime() - new Date(lastLeg.endTime).getTime() : Infinity;

    if (lastGroup && gapMs <= MERGE_GAP_MS) {
      lastGroup.legs.push(segment);
      lastGroup.lastIndex = i;
    } else {
      groups.push({ legs: [segment], firstIndex: i, lastIndex: i });
    }
  });

  return groups.map((group, groupIndex) => {
    const first = group.legs[0];
    const last = group.legs[group.legs.length - 1];
    const distanceMeters = group.legs.reduce((sum, leg) => sum + (leg.distanceMeters ?? 0), 0);
    const path = group.legs.flatMap((leg) => leg.path);
    const durationMs = Math.max(0, new Date(last.endTime).getTime() - new Date(first.startTime).getTime());

    let startLabel = coordLabel(first.startLocation);
    for (let j = group.firstIndex - 1; j >= 0; j--) {
      const prev = sorted[j];
      if (isVisit(prev)) {
        startLabel = labelForAdjoiningVisit(prev);
        break;
      }
      if (isTrip(prev)) break;
    }

    let endLabel = coordLabel(last.endLocation);
    for (let j = group.lastIndex + 1; j < sorted.length; j++) {
      const next = sorted[j];
      if (isVisit(next)) {
        endLabel = labelForAdjoiningVisit(next);
        break;
      }
      if (isTrip(next)) break;
    }

    return {
      id: first.id,
      legIds: group.legs.map((leg) => leg.id),
      index: groupIndex + 1,
      startTime: first.startTime,
      endTime: last.endTime,
      durationMs,
      distanceMeters,
      activityType: dominantActivity(group.legs),
      startLabel,
      endLabel,
      startLocation: first.startLocation,
      endLocation: last.endLocation,
      path,
    };
  });
}
