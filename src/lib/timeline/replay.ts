import { LatLng, TimelineSegment } from "./types";
import { isTrip, isVisit } from "./stats";

/**
 * "fixed" keeps the camera on the overview framing set before playback started.
 * "steady" pans to keep the marker centered at a constant zoom.
 * "dynamic" also eases zoom toward an activity-appropriate level and rotates to
 * face the direction of travel.
 */
export type CameraMode = "fixed" | "steady" | "dynamic";

export const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: "fixed", label: "Fixed zoom" },
  { id: "steady", label: "Steady following" },
  { id: "dynamic", label: "Dynamic following" },
];

export interface ReplayPoint extends LatLng {
  timeMs: number;
  /** The trip's activityType (e.g. "WALKING", "IN_BUS"), or "VISIT" while stationary at a place. */
  activityType?: string;
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
      points.push({ lat: segment.location.lat, lng: segment.location.lng, timeMs: start, activityType: "VISIT" });
      if (end > start) {
        points.push({ lat: segment.location.lat, lng: segment.location.lng, timeMs: end, activityType: "VISIT" });
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
        points.push({ lat: p.lat, lng: p.lng, timeMs, activityType: segment.activityType });
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
  /** The activity in effect at this moment — drives dynamic-camera zoom choices. */
  activityType?: string;
  /** Compass bearing (0-360) of travel toward the current position, if determinable. */
  bearing?: number;
}

function bearingBetween(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
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

  const behind = trail[trail.length - 2];
  const bearing =
    behind && (behind.lat !== position.lat || behind.lng !== position.lng)
      ? bearingBetween(behind, position)
      : undefined;

  return {
    frame: { position, trail, timeMs: atMs, activityType: current.activityType, bearing },
    nextIndex: i,
  };
}
