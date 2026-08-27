import { TimelineSegment } from "@/lib/timeline/types";
import { computeAnalytics } from "@/lib/timeline/analytics";
import { formatPlaceLabel } from "@/lib/timeline/format";
import { Translations } from "@/lib/i18n/translations";

/**
 * The AI-friendly shape of a timeline: semantic numbers, not GPS points. Built from the
 * Analytics Layer, never from raw segments/tracks directly — an on-device model has a
 * small context window and no business seeing tens of thousands of {lat, lng, timestamp}
 * records when "412 km across 43 places, mostly in Thu Duc" says the same thing in a
 * few hundred bytes.
 */
export interface AITimelineSummary {
  periodStart: string | null;
  periodEnd: string | null;
  totalDistanceKm: number;
  tripCount: number;
  visitCount: number;
  placesVisited: number;
  travelTimeHours: number;
  distanceByActivityKm: Record<string, number>;
  topAreas: Array<{ name: string; visits: number; hours: number }>;
  dailyStats: Array<{ date: string; distanceKm: number; tripCount: number }>;
}

/** Hard cap on how many daily entries ride along, even if the caller's segments span
 * years — keeps the prompt bounded regardless of how wide a range is currently selected.
 * On-device models have a much smaller context window than a cloud model (often just a
 * few thousand tokens), so this errs toward a compact prompt over a fully detailed one. */
const MAX_DAILY_ENTRIES = 31;
const MAX_TOP_AREAS = 6;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function buildAISummary(segments: TimelineSegment[], t: Translations): AITimelineSummary {
  const analytics = computeAnalytics(segments);
  const dailyStats = analytics.dailyStats.slice(-MAX_DAILY_ENTRIES);

  return {
    periodStart: analytics.earliestTime,
    periodEnd: analytics.latestTime,
    totalDistanceKm: round1(analytics.totalDistanceMeters / 1000),
    tripCount: analytics.tripCount,
    visitCount: analytics.visitCount,
    placesVisited: analytics.uniquePlaceCount,
    travelTimeHours: round1(analytics.totalMovingMs / 3600000),
    distanceByActivityKm: Object.fromEntries(
      Object.entries(analytics.distanceByActivity).map(([activity, meters]) => [activity, round1(meters / 1000)])
    ),
    topAreas: analytics.topAreas.slice(0, MAX_TOP_AREAS).map((area) => ({
      name: formatPlaceLabel(area.label, t),
      visits: area.visits,
      hours: round1(area.durationMs / 3600000),
    })),
    dailyStats: dailyStats.map((d) => ({
      date: d.date,
      distanceKm: round1(d.distanceMeters / 1000),
      tripCount: d.tripCount,
    })),
  };
}
