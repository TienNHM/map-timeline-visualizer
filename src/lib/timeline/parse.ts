import { pathDistance } from "./geo";
import { LatLng, TimelineData, TimelineSegment, TrackPoint } from "./types";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function parseLatLngString(value: unknown): LatLng | null {
  if (typeof value !== "string") return null;
  const parts = value.split(",");
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function fromE7(value: unknown): number | null {
  if (typeof value !== "number") return null;
  return value / 1e7;
}

function latLngFromE7Fields(obj: Record<string, unknown>): LatLng | null {
  const lat = fromE7(obj.latitudeE7);
  const lng = fromE7(obj.longitudeE7);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function latLngFromShortE7Fields(obj: Record<string, unknown> | undefined): LatLng | null {
  if (!obj) return null;
  const lat = fromE7(obj.latE7);
  const lng = fromE7(obj.lngE7);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

/**
 * Parses the current (2024+) on-device Google Maps Timeline export:
 * { semanticSegments: [ { startTime, endTime, visit: {...} } | { startTime, endTime, activity: {...}, timelinePath?: [...] } ] }
 */
function parseSemanticSegmentsV2(json: Record<string, unknown>): TimelineData {
  const segments: TimelineSegment[] = [];
  const warnings: string[] = [];
  const raw = json.semanticSegments as unknown[];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const startTime = e.startTime as string | undefined;
    const endTime = e.endTime as string | undefined;
    if (!startTime || !endTime) continue;

    if (e.visit && typeof e.visit === "object") {
      const visit = e.visit as Record<string, unknown>;
      const topCandidate = visit.topCandidate as Record<string, unknown> | undefined;
      const placeLocation = topCandidate?.placeLocation as Record<string, unknown> | undefined;
      const location = parseLatLngString(placeLocation?.latLng);
      if (!location) {
        warnings.push(`Skipped visit with unparseable location at ${startTime}`);
        continue;
      }
      segments.push({
        type: "visit",
        id: nextId("visit"),
        startTime,
        endTime,
        location,
        semanticType: topCandidate?.semanticType as string | undefined,
      });
      continue;
    }

    if (e.activity && typeof e.activity === "object") {
      const activity = e.activity as Record<string, unknown>;
      const start = parseLatLngString((activity.start as Record<string, unknown> | undefined)?.latLng);
      const end = parseLatLngString((activity.end as Record<string, unknown> | undefined)?.latLng);
      if (!start || !end) {
        warnings.push(`Skipped activity with unparseable location at ${startTime}`);
        continue;
      }
      const topCandidate = activity.topCandidate as Record<string, unknown> | undefined;

      const timelinePath = Array.isArray(e.timelinePath) ? (e.timelinePath as unknown[]) : [];
      const path: TrackPoint[] = timelinePath
        .map((p): TrackPoint | null => {
          if (typeof p !== "object" || p === null) return null;
          const pt = p as Record<string, unknown>;
          const loc = parseLatLngString(pt.point);
          if (!loc) return null;
          return { ...loc, time: pt.time as string | undefined };
        })
        .filter((p): p is TrackPoint => p !== null);

      const fullPath = path.length > 0 ? path : [start, end];
      const distanceMeters =
        typeof activity.distanceMeters === "number"
          ? activity.distanceMeters
          : pathDistance(fullPath);

      segments.push({
        type: "trip",
        id: nextId("trip"),
        startTime,
        endTime,
        startLocation: start,
        endLocation: end,
        path: fullPath,
        distanceMeters,
        activityType: topCandidate?.type as string | undefined,
      });
    }
  }

  segments.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return { segments, rawTrack: [], sourceFormat: "semantic-v2", warnings };
}

/**
 * Parses the legacy Semantic Location History export (Takeout, pre-2024):
 * { timelineObjects: [ { placeVisit: {...} } | { activitySegment: {...} } ] }
 */
function parseSemanticLegacy(json: Record<string, unknown>): TimelineData {
  const segments: TimelineSegment[] = [];
  const warnings: string[] = [];
  const raw = json.timelineObjects as unknown[];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;

    if (e.placeVisit && typeof e.placeVisit === "object") {
      const pv = e.placeVisit as Record<string, unknown>;
      const location = pv.location as Record<string, unknown> | undefined;
      const duration = pv.duration as Record<string, unknown> | undefined;
      const latLng = location ? latLngFromE7Fields(location) : null;
      const startTime = duration?.startTimestamp as string | undefined;
      const endTime = duration?.endTimestamp as string | undefined;
      if (!latLng || !startTime || !endTime) {
        warnings.push("Skipped placeVisit with missing location/time");
        continue;
      }
      segments.push({
        type: "visit",
        id: nextId("visit"),
        startTime,
        endTime,
        location: latLng,
        placeName: location?.name as string | undefined,
        address: location?.address as string | undefined,
        semanticType: location?.semanticType as string | undefined,
      });
      continue;
    }

    if (e.activitySegment && typeof e.activitySegment === "object") {
      const seg = e.activitySegment as Record<string, unknown>;
      const startLocation = seg.startLocation as Record<string, unknown> | undefined;
      const endLocation = seg.endLocation as Record<string, unknown> | undefined;
      const duration = seg.duration as Record<string, unknown> | undefined;
      const start = startLocation ? latLngFromE7Fields(startLocation) : null;
      const end = endLocation ? latLngFromE7Fields(endLocation) : null;
      const startTime = duration?.startTimestamp as string | undefined;
      const endTime = duration?.endTimestamp as string | undefined;
      if (!start || !end || !startTime || !endTime) {
        warnings.push("Skipped activitySegment with missing location/time");
        continue;
      }

      const waypointPath = seg.waypointPath as Record<string, unknown> | undefined;
      const waypoints = Array.isArray(waypointPath?.waypoints)
        ? (waypointPath!.waypoints as unknown[])
        : [];
      const path: TrackPoint[] = waypoints
        .map((w) => {
          if (typeof w !== "object" || w === null) return null;
          const wp = w as Record<string, unknown>;
          const lat = fromE7(wp.latE7);
          const lng = fromE7(wp.lngE7);
          if (lat === null || lng === null) return null;
          return { lat, lng };
        })
        .filter((p): p is TrackPoint => p !== null);

      const fullPath = path.length > 0 ? path : [start, end];
      const distanceMeters =
        typeof seg.distance === "number" ? seg.distance : pathDistance(fullPath);

      segments.push({
        type: "trip",
        id: nextId("trip"),
        startTime,
        endTime,
        startLocation: start,
        endLocation: end,
        path: fullPath,
        distanceMeters,
        activityType: seg.activityType as string | undefined,
      });
    }
  }

  segments.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return { segments, rawTrack: [], sourceFormat: "semantic-legacy", warnings };
}

/**
 * Parses raw location pings (Records.json): { locations: [ {latitudeE7, longitudeE7, timestamp} ] }
 * No semantic visit/trip info is available, so the whole track is exposed as a single trip-like path.
 */
function parseRawRecords(json: Record<string, unknown>): TimelineData {
  const warnings: string[] = [];
  const raw = json.locations as unknown[];

  const points: TrackPoint[] = raw
    .map((entry): TrackPoint | null => {
      if (typeof entry !== "object" || entry === null) return null;
      const e = entry as Record<string, unknown>;
      const latLng = latLngFromE7Fields(e);
      if (!latLng) return null;
      const timestamp =
        (e.timestamp as string | undefined) ??
        (typeof e.timestampMs === "string" ? new Date(Number(e.timestampMs)).toISOString() : undefined);
      return { ...latLng, time: timestamp };
    })
    .filter((p): p is TrackPoint => p !== null);

  if (points.length === 0) {
    warnings.push("No parseable location points found in Records.json");
    return { segments: [], rawTrack: [], sourceFormat: "raw-records", warnings };
  }

  points.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const segment: TimelineSegment = {
    type: "trip",
    id: nextId("track"),
    startTime: points[0].time ?? "",
    endTime: points[points.length - 1].time ?? "",
    startLocation: points[0],
    endLocation: points[points.length - 1],
    path: points,
    distanceMeters: pathDistance(points),
  };

  return { segments: [segment], rawTrack: [], sourceFormat: "raw-records", warnings };
}

/**
 * Parses Google Takeout's "Timeline Edits.json": a flat edit log of
 * { timelineEdits: [ { rawSignal } | { semanticLocationStates } | { inferredSemanticSegment } | { userEditedSemanticSegment } ] }
 * where locations use latE7/lngE7 and segments carry no timelinePath of their own —
 * so trip paths are reconstructed from the rawSignal GPS pings that fall within each trip's time range.
 */
function parseTimelineEdits(json: Record<string, unknown>): TimelineData {
  const warnings: string[] = [];
  const raw = json.timelineEdits as unknown[];

  const rawTrack: TrackPoint[] = [];
  // Keyed by startTime so a userEditedSemanticSegment overrides an inferredSemanticSegment for the same segment.
  const segmentEntries = new Map<
    string,
    { startTime: string; endTime: string; segment: Record<string, unknown>; priority: number }
  >();

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;

    const positionSignal = (e.rawSignal as Record<string, unknown> | undefined)?.signal as
      | Record<string, unknown>
      | undefined;
    const position = positionSignal?.position as Record<string, unknown> | undefined;
    if (position) {
      const loc = latLngFromShortE7Fields(position.point as Record<string, unknown> | undefined);
      if (loc) {
        rawTrack.push({ ...loc, time: position.timestamp as string | undefined });
      }
      continue;
    }

    for (const [key, priority] of [
      ["inferredSemanticSegment", 0],
      ["userEditedSemanticSegment", 1],
    ] as const) {
      const wrapper = e[key] as Record<string, unknown> | undefined;
      if (!wrapper) continue;
      const startTime = wrapper.startTime as string | undefined;
      const endTime = wrapper.endTime as string | undefined;
      const segment = wrapper.segment as Record<string, unknown> | undefined;
      if (!startTime || !endTime || !segment) continue;
      const existing = segmentEntries.get(startTime);
      if (!existing || priority >= existing.priority) {
        segmentEntries.set(startTime, { startTime, endTime, segment, priority });
      }
    }
  }

  rawTrack.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const segments: TimelineSegment[] = [];
  for (const { startTime, endTime, segment } of segmentEntries.values()) {
    if (segment.visit && typeof segment.visit === "object") {
      const visit = segment.visit as Record<string, unknown>;
      const topCandidate = visit.topCandidate as Record<string, unknown> | undefined;
      const location = latLngFromShortE7Fields(
        topCandidate?.placeLocation as Record<string, unknown> | undefined
      );
      if (!location) {
        warnings.push(`Skipped visit with unparseable location at ${startTime}`);
        continue;
      }
      const semanticType = topCandidate?.semanticType as string | undefined;
      segments.push({
        type: "visit",
        id: nextId("visit"),
        startTime,
        endTime,
        location,
        semanticType: semanticType && semanticType !== "UNKNOWN" ? semanticType : undefined,
      });
      continue;
    }

    if (segment.activity && typeof segment.activity === "object") {
      const activity = segment.activity as Record<string, unknown>;
      const start = latLngFromShortE7Fields(activity.start as Record<string, unknown> | undefined);
      const end = latLngFromShortE7Fields(activity.end as Record<string, unknown> | undefined);
      if (!start || !end) {
        warnings.push(`Skipped activity with unparseable location at ${startTime}`);
        continue;
      }
      const topCandidate = activity.topCandidate as Record<string, unknown> | undefined;

      const pathFromTrack = rawTrack.filter(
        (p) => (p.time ?? "") >= startTime && (p.time ?? "") <= endTime
      );
      const fullPath = pathFromTrack.length > 0 ? pathFromTrack : [start, end];
      const distanceMeters =
        typeof activity.distanceMeters === "number"
          ? activity.distanceMeters
          : pathDistance(fullPath);

      segments.push({
        type: "trip",
        id: nextId("trip"),
        startTime,
        endTime,
        startLocation: start,
        endLocation: end,
        path: fullPath,
        distanceMeters,
        activityType: topCandidate?.type as string | undefined,
      });
    }
  }

  segments.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return { segments, rawTrack, sourceFormat: "timeline-edits", warnings };
}

export function parseGoogleTimelineFile(json: unknown): TimelineData {
  if (typeof json !== "object" || json === null) {
    throw new Error("File does not contain a valid JSON object");
  }
  const obj = json as Record<string, unknown>;

  if (Array.isArray(obj.semanticSegments)) {
    return parseSemanticSegmentsV2(obj);
  }
  if (Array.isArray(obj.timelineObjects)) {
    return parseSemanticLegacy(obj);
  }
  if (Array.isArray(obj.locations)) {
    return parseRawRecords(obj);
  }
  if (Array.isArray(obj.timelineEdits)) {
    return parseTimelineEdits(obj);
  }

  throw new Error(
    "Unrecognized Google Timeline export format. Expected 'semanticSegments', 'timelineObjects', 'locations', or 'timelineEdits'."
  );
}
