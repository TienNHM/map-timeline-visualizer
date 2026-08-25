import { TimelineSegment, TrackPoint } from "./types";

/**
 * Drops track points whose reported GPS accuracy radius exceeds `limitMeters` — noisy
 * pings (e.g. from cell-tower or wifi positioning) otherwise show up as spurious jitter
 * in the raw track line and as jagged detours in reconstructed trip paths. Points with
 * no accuracy reading are always kept, since there's nothing to judge them against.
 * A trip's path is only filtered if at least two points would remain; otherwise the
 * original path is kept so the trip doesn't collapse to nothing.
 */
export function filterByAccuracy(
  segments: TimelineSegment[],
  rawTrack: TrackPoint[],
  limitMeters: number | null
): { segments: TimelineSegment[]; rawTrack: TrackPoint[] } {
  if (limitMeters === null) return { segments, rawTrack };

  const withinLimit = (p: TrackPoint) => p.accuracyMeters === undefined || p.accuracyMeters <= limitMeters;

  const filteredRawTrack = rawTrack.filter(withinLimit);

  const filteredSegments = segments.map((segment) => {
    if (segment.type !== "trip") return segment;
    const filteredPath = segment.path.filter(withinLimit);
    return filteredPath.length >= 2 ? { ...segment, path: filteredPath } : segment;
  });

  return { segments: filteredSegments, rawTrack: filteredRawTrack };
}
