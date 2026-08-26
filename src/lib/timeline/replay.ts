import { LatLng, TimelineSegment } from "./types";
import { isTrip, isVisit } from "./stats";
import { haversineDistance } from "./geo";

/**
 * "fixed" keeps the camera on the overview framing set before playback started.
 * "steady" pans to keep the marker centered, easing zoom to a speed-appropriate level
 * (so a fast/far leg between sparse GPS points doesn't run off-screen) but keeping a
 * fixed north-up bearing.
 * "dynamic" does the same but also rotates to face the direction of travel.
 */
export type CameraMode = "fixed" | "steady" | "dynamic";

// Labels/descriptions live in the locale translations (t.cameraModes), not here, since
// this list is display-order data shared by every locale.
export const CAMERA_MODE_IDS: CameraMode[] = ["fixed", "steady", "dynamic"];

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

/** Caps how many recent points the drawn trail keeps — see advanceReplay for why. */
const MAX_TRAIL_POINTS = 300;

export interface ReplayPacing {
  /** Wall-clock playback ms (at 1x) at which the track reaches point i; same length as track. */
  cumMs: number[];
  totalMs: number;
}

// A single leg's *real* duration, spread proportionally across the whole replay, can compress
// to a fraction of a frame once the import spans months (e.g. a 2-hour drive is a tiny sliver
// of a 1.5-year timeline) — the marker would teleport between two far-apart points instead of
// visibly traveling. Flooring each leg's playback time by its real-world distance keeps big
// jumps on screen long enough to actually watch, like a real GPS tracker replaying a route.
const MIN_LEG_MS_PER_KM = 40;
const MAX_LEG_STRETCH_MS = 2200;

/**
 * Builds a wall-clock (1x-speed) playback schedule for a track: each leg gets at least
 * `basePlaybackMs`'s proportional share of its real duration, floored by a minimum tied to
 * the leg's geographic distance so sparse, far-apart GPS pings stay visible. The resulting
 * total can run longer than `basePlaybackMs` when legs needed stretching.
 */
export function buildReplayPacing(track: ReplayPoint[], basePlaybackMs: number): ReplayPacing {
  if (track.length < 2) return { cumMs: track.map(() => 0), totalMs: 0 };
  const spanMs = Math.max(track[track.length - 1].timeMs - track[0].timeMs, 1);
  const cumMs = [0];
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    const naturalMs = ((b.timeMs - a.timeMs) / spanMs) * basePlaybackMs;
    const distanceKm = haversineDistance(a, b) / 1000;
    const minMs = Math.min(distanceKm * MIN_LEG_MS_PER_KM, MAX_LEG_STRETCH_MS);
    cumMs.push(cumMs[i] + Math.max(naturalMs, minMs));
  }
  return { cumMs, totalMs: cumMs[cumMs.length - 1] };
}

/**
 * Maps elapsed wall-clock playback progress (ms, at 1x — the caller applies the speed
 * multiplier before calling) to the "virtual" timeline timestamp advanceReplay expects,
 * walking the pacing schedule forward from a known cursor.
 */
export function pacingToAtMs(
  track: ReplayPoint[],
  pacing: ReplayPacing,
  playbackMs: number,
  fromIndex: number
): { atMs: number; nextIndex: number } {
  if (track.length === 0) return { atMs: 0, nextIndex: 0 };

  let i = fromIndex;
  while (i + 1 < track.length && pacing.cumMs[i + 1] <= playbackMs) {
    i += 1;
  }

  const current = track[i];
  const next = track[i + 1];
  if (!next) return { atMs: current.timeMs, nextIndex: i };

  const legStart = pacing.cumMs[i];
  const legEnd = pacing.cumMs[i + 1];
  const fraction = legEnd > legStart ? Math.min(1, Math.max(0, (playbackMs - legStart) / (legEnd - legStart))) : 1;
  const atMs = current.timeMs + fraction * (next.timeMs - current.timeMs);
  return { atMs, nextIndex: i };
}

/** Inverse of pacingToAtMs, for keeping the wall-clock playback cursor in sync after the
 * user scrubs the (real-time) progress slider directly to a timestamp. */
export function atMsToPlaybackMs(track: ReplayPoint[], pacing: ReplayPacing, atMs: number): number {
  if (track.length === 0) return 0;

  let i = 0;
  while (i + 1 < track.length && track[i + 1].timeMs <= atMs) {
    i += 1;
  }

  const current = track[i];
  const next = track[i + 1];
  if (!next || next.timeMs <= current.timeMs) return pacing.cumMs[i] ?? 0;

  const fraction = Math.min(1, Math.max(0, (atMs - current.timeMs) / (next.timeMs - current.timeMs)));
  return pacing.cumMs[i] + fraction * (pacing.cumMs[i + 1] - pacing.cumMs[i]);
}

export interface ReplayFrame {
  position: LatLng;
  /** The most recent points reached (bounded by MAX_TRAIL_POINTS), including the interpolated current position. */
  trail: LatLng[];
  timeMs: number;
  /** The activity in effect at this moment (informational; dynamic-camera zoom is speed-based). */
  activityType?: string;
  /** Compass bearing (0-360) of travel toward the current position, if determinable. */
  bearing?: number;
  /** Instantaneous speed over the current track leg, in km/h — drives dynamic-camera zoom. */
  speedKmh: number;
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

  // Only the most recent leg of history is rendered as the trail. Drawing the full
  // journey-so-far as one LineString gets extremely expensive (and visually reads as
  // flashing/glaring, since old, far-away points keep re-rendering every frame) once a
  // replay covers a large multi-month import with thousands of points.
  const trailStart = Math.max(0, i + 1 - MAX_TRAIL_POINTS);
  const trail: LatLng[] = track.slice(trailStart, i + 1).map((p) => ({ lat: p.lat, lng: p.lng }));
  trail.push(position);

  const behind = trail[trail.length - 2];
  const bearing =
    behind && (behind.lat !== position.lat || behind.lng !== position.lng)
      ? bearingBetween(behind, position)
      : undefined;

  let speedKmh = 0;
  if (next && next.timeMs > current.timeMs) {
    const legMeters = haversineDistance(current, next);
    const legSeconds = (next.timeMs - current.timeMs) / 1000;
    speedKmh = (legMeters / legSeconds) * 3.6;
  }

  return {
    frame: { position, trail, timeMs: atMs, activityType: current.activityType, bearing, speedKmh },
    nextIndex: i,
  };
}
