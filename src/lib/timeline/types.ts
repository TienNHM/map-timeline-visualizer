export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrackPoint extends LatLng {
  time?: string;
  /** Reported GPS accuracy radius in meters, when the source data provides it. */
  accuracyMeters?: number;
}

export interface Visit {
  type: "visit";
  id: string;
  startTime: string;
  endTime: string;
  location: LatLng;
  placeName?: string;
  address?: string;
  semanticType?: string;
}

export interface Trip {
  type: "trip";
  id: string;
  startTime: string;
  endTime: string;
  startLocation: LatLng;
  endLocation: LatLng;
  path: TrackPoint[];
  distanceMeters?: number;
  activityType?: string;
}

export type TimelineSegment = Visit | Trip;

export interface TimelineData {
  segments: TimelineSegment[];
  /** Raw GPS pings not tied to a semantic segment, e.g. from Takeout's Timeline Edits.json. */
  rawTrack: TrackPoint[];
  sourceFormat: "semantic-v2" | "semantic-legacy" | "raw-records" | "timeline-edits";
  warnings: string[];
}
