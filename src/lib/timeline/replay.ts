import { LatLng, TimelineSegment } from "./types";
import { isTrip, isVisit } from "./stats";

export interface ReplayPoint extends LatLng {
  timeMs: number;
}

function toMs(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? NaN : ms;
}

function isFinitePoint(p: ReplayPoint): boolean {
  return Number.isFinite(p.timeMs) && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

/**
 * Flattens trips and visits into a single chronological list of {lat, lng, timeMs}
 * points that a replay cursor can walk through and interpolate between. Trip paths
 * that lack per-point timestamps (e.g. legacy formats with only a start/end pair)
 * get evenly spaced synthetic timestamps across the trip's duration.
 */
export function buildReplayTrack(segments: TimelineSegment[]): ReplayPoint[] {
  const points: ReplayPoint[] = [];

  for (const segment of segments) {
    if (isVisit(segment)) {
      const start = toMs(segment.startTime);
      const end = toMs(segment.endTime);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      points.push({ lat: segment.location.lat, lng: segment.location.lng, timeMs: start });
      if (end > start) {
        points.push({ lat: segment.location.lat, lng: segment.location.lng, timeMs: end });
      }
      continue;
    }

    if (isTrip(segment)) {
      const start = toMs(segment.startTime);
      const end = toMs(segment.endTime);
      if (Number.isNaN(start) || Number.isNaN(end) || segment.path.length === 0) continue;

      const allHaveTime = segment.path.every((p) => p.time && !Number.isNaN(toMs(p.time)));
      segment.path.forEach((p, i) => {
        const timeMs = allHaveTime
          ? toMs(p.time as string)
          : segment.path.length === 1
            ? start
            : start + ((end - start) * i) / (segment.path.length - 1);
        points.push({ lat: p.lat, lng: p.lng, timeMs });
      });
    }
  }

  return points
    .filter(isFinitePoint)
    .sort((a, b) => a.timeMs - b.timeMs);
}

export interface ReplayFrame {
  position: LatLng;
  /** All track points reached so far, in order, including the interpolated current position. */
  trail: LatLng[];
  timeMs: number;
}

/**
 * Given a sorted replay track and a cursor index known to be valid for some earlier
 * time, advances the cursor to the last point at or before `atMs` and linearly
 * interpolates the position between it and the next point. Returns the new cursor
 * index so the caller can resume the scan from there on the next call instead of
 * rescanning from the start every tick.
 */
export function advanceReplay(
  track: ReplayPoint[],
  atMs: number,
  fromIndex: number
): { frame: ReplayFrame; nextIndex: number } | null {
  if (track.length === 0) return null;

  let i = fromIndex;
  while (i + 1 < track.length && track[i + 1].timeMs <= atMs) {
    i += 1;
  }

  const current = track[i];
  const next = track[i + 1];
  let position: LatLng = { lat: current.lat, lng: current.lng };

  if (next && next.timeMs > current.timeMs) {
    const fraction = Math.min(1, Math.max(0, (atMs - current.timeMs) / (next.timeMs - current.timeMs)));
    position = {
      lat: current.lat + (next.lat - current.lat) * fraction,
      lng: current.lng + (next.lng - current.lng) * fraction,
    };
  }

  const trail: LatLng[] = track.slice(0, i + 1).map((p) => ({ lat: p.lat, lng: p.lng }));
  trail.push(position);

  return { frame: { position, trail, timeMs: atMs }, nextIndex: i };
}
