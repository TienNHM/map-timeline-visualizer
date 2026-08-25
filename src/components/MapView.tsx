"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { TimelineSegment, TrackPoint } from "@/lib/timeline/types";
import { boundsOf } from "@/lib/timeline/geo";
import { isTrip, isVisit } from "@/lib/timeline/stats";
import { CameraMode, ReplayFrame } from "@/lib/timeline/replay";
import { useTheme } from "@/components/ThemeProvider";
import { loadTintedStyle } from "@/lib/mapTint";

// MapLibre's default worker auto-detection breaks when bundled by Next.js, leaving
// GeoJSON sources permanently stuck in a "loading" state with nothing rendered.
// maplibre-gl-worker.mjs relatively imports maplibre-gl-shared.mjs, so both are copied
// into public/maplibre (see package.json's postinstall) and served from there as-is,
// rather than pointed at via a bundler asset URL that would drop the sibling chunk.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

interface MapViewProps {
  segments: TimelineSegment[];
  rawTrack?: TrackPoint[];
  replayFrame?: ReplayFrame | null;
  cameraMode?: CameraMode;
}

interface DynamicCameraState {
  zoom: number | null;
  bearing: number;
}

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] };

interface OverlayColors {
  accent: string;
  accent2: string;
  isLight: boolean;
}

export default function MapView({
  segments,
  rawTrack = [],
  replayFrame = null,
  cameraMode = "steady",
}: MapViewProps) {
  const { themeId, isLight, themes } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const segmentsRef = useRef(segments);
  const rawTrackRef = useRef(rawTrack);
  const replayFrameRef = useRef(replayFrame);
  const colorsRef = useRef<OverlayColors>(themeColors(themeId, isLight, themes));
  const hasFitRef = useRef(false);
  const styleGenerationRef = useRef(0);
  const dynamicCamRef = useRef<DynamicCameraState>({ zoom: null, bearing: 0 });

  useEffect(() => {
    segmentsRef.current = segments;
    rawTrackRef.current = rawTrack;
  }, [segments, rawTrack]);

  useEffect(() => {
    replayFrameRef.current = replayFrame;
  }, [replayFrame]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    const generation = ++styleGenerationRef.current;

    loadTintedStyle(colorsRef.current.isLight, colorsRef.current.accent, colorsRef.current.accent2).then((style) => {
      if (cancelled || !containerRef.current || generation !== styleGenerationRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [0, 0],
        zoom: 2,
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");

      // Fires on initial style load AND after every setStyle() call, so this single
      // handler both bootstraps the overlay layers and re-adds them when the basemap
      // is swapped for a different theme's tint.
      map.on("style.load", () => {
        setupOverlayLayers(map, colorsRef.current);
        renderData(map, segmentsRef.current, rawTrackRef.current, { fit: !hasFitRef.current });
        hasFitRef.current = true;
        renderReplayFrame(map, replayFrameRef.current, { pan: false });
        setStaticLayersDimmed(map, !!replayFrameRef.current);
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      renderData(mapRef.current, segments, rawTrack, { fit: true });
    }
  }, [segments, rawTrack]);

  useEffect(() => {
    const nextColors = themeColors(themeId, isLight, themes);
    colorsRef.current = nextColors;
    const map = mapRef.current;
    if (!map) return;

    const generation = ++styleGenerationRef.current;
    loadTintedStyle(nextColors.isLight, nextColors.accent, nextColors.accent2).then((style) => {
      if (generation !== styleGenerationRef.current || mapRef.current !== map) return;
      map.setStyle(style);
    });
  }, [themeId, isLight, themes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!replayFrame) dynamicCamRef.current.zoom = null;
    renderReplayFrame(map, replayFrame, { pan: true, cameraMode, dynamicCam: dynamicCamRef.current });
  }, [replayFrame, cameraMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) setStaticLayersDimmed(map, !!replayFrame);
    // Only the start/stop transition (not every per-frame position update) should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!replayFrame]);

  return (
    <div ref={containerRef} className={`h-full min-h-100 w-full ${isLight ? "" : "map-dark-tiles"}`} />
  );
}

function themeColors(themeId: string, isLight: boolean, themes: { id: string; swatch: [string, string] }[]): OverlayColors {
  const theme = themes.find((t) => t.id === themeId) ?? themes[0];
  return { accent: theme.swatch[0], accent2: theme.swatch[1], isLight };
}

function setupOverlayLayers(map: MapLibreMap, colors: OverlayColors) {
  if (!map.getSource("raw-track")) {
    map.addSource("raw-track", { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "raw-track-line",
      type: "line",
      source: "raw-track",
      paint: {
        "line-color": colors.isLight ? "#111111" : "#ffffff",
        "line-width": 1.5,
        "line-opacity": 0.3,
        "line-dasharray": [1, 1.5],
      },
    });
  }

  if (!map.getSource("trips")) {
    map.addSource("trips", { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "trips-line",
      type: "line",
      source: "trips",
      paint: {
        "line-color": colors.accent,
        "line-width": 2.5,
        "line-opacity": 0.9,
      },
    });
  }

  if (!map.getSource("visits")) {
    map.addSource("visits", { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "visits-circle",
      type: "circle",
      source: "visits",
      paint: {
        "circle-radius": 5,
        "circle-color": colors.accent2,
        "circle-opacity": 1,
        "circle-stroke-width": 2,
        "circle-stroke-color": colors.isLight ? "#ffffff" : "#0b0b12",
      },
    });
  }

  if (!map.getSource("replay-trail")) {
    map.addSource("replay-trail", { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "replay-trail-line",
      type: "line",
      source: "replay-trail",
      paint: {
        "line-color": colors.accent2,
        "line-width": 4,
        "line-opacity": 0.85,
      },
    });
  }

  if (!map.getSource("replay-marker")) {
    map.addSource("replay-marker", { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "replay-marker-halo",
      type: "circle",
      source: "replay-marker",
      paint: {
        "circle-radius": 12,
        "circle-color": colors.accent2,
        "circle-opacity": 0.25,
      },
    });
    map.addLayer({
      id: "replay-marker-dot",
      type: "circle",
      source: "replay-marker",
      paint: {
        "circle-radius": 6,
        "circle-color": colors.accent2,
        "circle-stroke-width": 2,
        "circle-stroke-color": colors.isLight ? "#ffffff" : "#0b0b12",
      },
    });
  }
}

// Continuous speed -> zoom curve (km/h, zoom), piecewise-linear between points, so the
// dynamic camera reacts to how fast you're actually covering ground rather than a coarse
// per-activity bucket — walking a 2 km/h stroll and a 2 km/h traffic-jammed bus both read
// as "close", while the same bus at highway speed pulls back automatically.
const SPEED_ZOOM_CURVE: [number, number][] = [
  [0, 16],
  [5, 15.5],
  [15, 14.5],
  [30, 13],
  [60, 11.5],
  [120, 9],
  [300, 6],
];

function zoomForSpeedKmh(speedKmh: number): number {
  if (speedKmh <= SPEED_ZOOM_CURVE[0][0]) return SPEED_ZOOM_CURVE[0][1];
  for (let i = 1; i < SPEED_ZOOM_CURVE.length; i++) {
    const [s0, z0] = SPEED_ZOOM_CURVE[i - 1];
    const [s1, z1] = SPEED_ZOOM_CURVE[i];
    if (speedKmh <= s1) {
      const t = (speedKmh - s0) / (s1 - s0);
      return z0 + (z1 - z0) * t;
    }
  }
  return SPEED_ZOOM_CURVE[SPEED_ZOOM_CURVE.length - 1][1];
}

/** Per-frame easing factors for the dynamic camera (0-1, higher = snappier). Zooming
 * out reacts quickly so a sudden burst of speed doesn't clip off-screen; zooming back
 * in eases more gently so the camera doesn't feel twitchy while cruising. */
const ZOOM_OUT_EASE = 0.1;
const ZOOM_IN_EASE = 0.045;
const BEARING_EASE = 0.06;

function lerpAngle(current: number, target: number, factor: number): number {
  const delta = ((target - current + 540) % 360) - 180;
  return (current + delta * factor + 360) % 360;
}

const STATIC_LAYER_OPACITY = {
  full: { trips: 0.9, visits: 1, rawTrack: 0.3 },
  dimmed: { trips: 0.12, visits: 0.2, rawTrack: 0.08 },
};

/**
 * Fades the always-visible full-history layers (every trip/visit in the selected date
 * range) out of the way while a replay is active. Without this, replaying a large,
 * unscoped import at a close dynamic-camera zoom buries the moving marker/trail under
 * a dense tangle of unrelated trips that happen to pass near the same spot at some
 * other point in the whole range — which reads as visual noise/glare, not a route.
 */
function setStaticLayersDimmed(map: MapLibreMap, dimmed: boolean) {
  const opacity = dimmed ? STATIC_LAYER_OPACITY.dimmed : STATIC_LAYER_OPACITY.full;
  if (map.getLayer("trips-line")) map.setPaintProperty("trips-line", "line-opacity", opacity.trips);
  if (map.getLayer("visits-circle")) map.setPaintProperty("visits-circle", "circle-opacity", opacity.visits);
  if (map.getLayer("raw-track-line")) map.setPaintProperty("raw-track-line", "line-opacity", opacity.rawTrack);
}

function renderReplayFrame(
  map: MapLibreMap,
  frame: ReplayFrame | null | undefined,
  options: { pan: boolean; cameraMode?: CameraMode; dynamicCam?: DynamicCameraState }
) {
  const trailSource = map.getSource("replay-trail") as GeoJSONSource | undefined;
  const markerSource = map.getSource("replay-marker") as GeoJSONSource | undefined;

  if (!frame) {
    trailSource?.setData(EMPTY_FC);
    markerSource?.setData(EMPTY_FC);
    return;
  }

  trailSource?.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: frame.trail.map((p) => [p.lng, p.lat]),
        },
      },
    ],
  });

  markerSource?.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [frame.position.lng, frame.position.lat] },
      },
    ],
  });

  if (!options.pan) return;

  const center: [number, number] = [frame.position.lng, frame.position.lat];
  const cameraMode = options.cameraMode ?? "steady";

  // jumpTo (no easing) is deliberate throughout: replay frames already arrive ~60/sec
  // with their own eased interpolation (and, in dynamic mode, their own zoom/bearing
  // easing below), so layering map easing on top would fight itself and read as
  // stutter instead of smooth continuous motion.
  if (cameraMode === "fixed") {
    return;
  }

  if (cameraMode === "steady" || !options.dynamicCam) {
    map.jumpTo({ center, bearing: 0 });
    return;
  }

  const dynamicCam = options.dynamicCam;
  if (dynamicCam.zoom === null) dynamicCam.zoom = map.getZoom();
  const targetZoom = zoomForSpeedKmh(frame.speedKmh);
  const zoomEase = targetZoom < dynamicCam.zoom ? ZOOM_OUT_EASE : ZOOM_IN_EASE;
  dynamicCam.zoom += (targetZoom - dynamicCam.zoom) * zoomEase;
  if (frame.bearing !== undefined) {
    dynamicCam.bearing = lerpAngle(dynamicCam.bearing, frame.bearing, BEARING_EASE);
  }

  map.jumpTo({ center, zoom: dynamicCam.zoom, bearing: dynamicCam.bearing });
}

function renderData(
  map: MapLibreMap,
  segments: TimelineSegment[],
  rawTrack: TrackPoint[],
  options: { fit: boolean }
) {
  const rawTrackSource = map.getSource("raw-track") as GeoJSONSource | undefined;
  if (rawTrack.length > 1) {
    rawTrackSource?.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: rawTrack.map((p) => [p.lng, p.lat]),
          },
        },
      ],
    });
  } else {
    rawTrackSource?.setData(EMPTY_FC);
  }

  const tripFeatures = segments.filter(isTrip).map((trip) => ({
    type: "Feature" as const,
    properties: { id: trip.id, activityType: trip.activityType ?? "unknown" },
    geometry: {
      type: "LineString" as const,
      coordinates: trip.path.map((p) => [p.lng, p.lat]),
    },
  }));

  const visitFeatures = segments.filter(isVisit).map((visit) => ({
    type: "Feature" as const,
    properties: {
      id: visit.id,
      label: visit.placeName ?? visit.semanticType ?? "Visit",
    },
    geometry: {
      type: "Point" as const,
      coordinates: [visit.location.lng, visit.location.lat],
    },
  }));

  const tripSource = map.getSource("trips") as GeoJSONSource | undefined;
  tripSource?.setData({ type: "FeatureCollection", features: tripFeatures });

  const visitSource = map.getSource("visits") as GeoJSONSource | undefined;
  visitSource?.setData({ type: "FeatureCollection", features: visitFeatures });

  if (!options.fit) return;

  const allPoints = [
    ...segments.filter(isTrip).flatMap((t) => t.path),
    ...segments.filter(isVisit).map((v) => v.location),
    ...rawTrack,
  ];
  const bounds = boundsOf(allPoints);
  if (bounds) {
    map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
  }
}
