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
import { useLocale } from "@/components/LocaleProvider";
import { loadTintedStyle } from "@/lib/mapTint";
import { Icon } from "@/components/Icon";

// MapLibre's default worker auto-detection breaks when bundled by Next.js, leaving
// GeoJSON sources permanently stuck in a "loading" state with nothing rendered.
// maplibre-gl-worker.mjs relatively imports maplibre-gl-shared.mjs, so both are copied
// into public/maplibre (see package.json's postinstall) and served from there as-is,
// rather than pointed at via a bundler asset URL that would drop the sibling chunk.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export interface FocusBounds {
  bounds: [[number, number], [number, number]];
  /** Bumped by the caller on every selection, including re-selecting the same trip,
   * so the fit effect always re-runs even when the bounds value is unchanged. */
  token: number;
}

interface MapViewProps {
  segments: TimelineSegment[];
  rawTrack?: TrackPoint[];
  replayFrame?: ReplayFrame | null;
  cameraMode?: CameraMode;
  /** When set, the map fits to these bounds (e.g. a trip selected from the trip list). */
  focusBounds?: FocusBounds | null;
  showHeatmap?: boolean;
  onToggleHeatmap?: () => void;
}

interface DynamicCameraState {
  center: [number, number] | null;
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
  focusBounds = null,
  showHeatmap = false,
  onToggleHeatmap,
}: MapViewProps) {
  const { themeId, isLight, themes } = useTheme();
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const segmentsRef = useRef(segments);
  const rawTrackRef = useRef(rawTrack);
  const replayFrameRef = useRef(replayFrame);
  const colorsRef = useRef<OverlayColors>(themeColors(themeId, isLight, themes));
  const hasFitRef = useRef(false);
  const styleGenerationRef = useRef(0);
  const dynamicCamRef = useRef<DynamicCameraState>({ center: null, zoom: null, bearing: 0 });
  const showHeatmapRef = useRef(showHeatmap);

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
        setHeatmapVisible(map, showHeatmapRef.current);
        setStaticLayersDimmed(map, !!replayFrameRef.current || showHeatmapRef.current);
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // MapLibre sizes its canvas from the container's dimensions at creation time and
  // doesn't re-measure on its own. Without this, any later layout shift that resizes
  // the container — switching design style (border widths/spacing changing), opening
  // a dropdown that reflows the page, a window resize — leaves the canvas stretched to
  // its stale size instead of the container's new one, which reads as a broken/overflowing map.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let rafId = 0;
    const observer = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        mapRef.current?.resize();
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
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
    if (!replayFrame) {
      dynamicCamRef.current.center = null;
      dynamicCamRef.current.zoom = null;
    }
    renderReplayFrame(map, replayFrame, { pan: true, cameraMode, dynamicCam: dynamicCamRef.current });
  }, [replayFrame, cameraMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) setStaticLayersDimmed(map, !!replayFrame || showHeatmap);
    // Only the start/stop transition (not every per-frame position update) should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!replayFrame, showHeatmap]);

  useEffect(() => {
    showHeatmapRef.current = showHeatmap;
    const map = mapRef.current;
    if (map) setHeatmapVisible(map, showHeatmap);
  }, [showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusBounds) return;
    map.fitBounds(focusBounds.bounds, { padding: 80, maxZoom: 16, duration: 800 });
    // token is the deliberate re-trigger key — see FocusBounds' doc comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusBounds?.token]);

  // The conditional class lives on this wrapper, not the div passed to `new
  // maplibregl.Map({ container })` below. MapLibre adds its own classes (e.g.
  // "maplibregl-map", which is what makes `position: relative` apply so the canvas
  // positions correctly) to that container imperatively, outside React's knowledge.
  // If React's className prop on that same element ever changed — which it did here
  // whenever isLight flipped — React would overwrite the whole className attribute
  // and silently wipe out MapLibre's classes, breaking the canvas's positioning.
  return (
    <div className={`relative h-full w-full ${isLight ? "" : "map-dark-tiles"}`}>
      <div ref={containerRef} className="h-full min-h-100 w-full" />
      <button
        onClick={onToggleHeatmap}
        aria-pressed={showHeatmap}
        title={t.heatmap.toggleLabel}
        className={`absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-(--panel-border) bg-(--panel) shadow-lg transition-colors ${
          showHeatmap ? "text-(--accent)" : "text-(--text-muted) hover:text-(--text)"
        }`}
      >
        <Icon name="heatmap" className="h-4.5 w-4.5" />
      </button>
    </div>
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

  if (!map.getSource("heatmap-points")) {
    map.addSource("heatmap-points", { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "heatmap-layer",
      type: "heatmap",
      source: "heatmap-points",
      layout: { visibility: "none" },
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 24, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(33,102,172,0)",
          0.2, "rgb(103,169,207)",
          0.4, "rgb(209,229,240)",
          0.6, "rgb(253,219,199)",
          0.8, "rgb(239,138,98)",
          1, "rgb(178,24,43)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20, 15, 40],
        "heatmap-opacity": 0.8,
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

/** Zoom is never allowed to ease past these, regardless of how the leg's bounds fit —
 * MAX keeps near-stationary legs (two almost-identical points) from snapping to an
 * absurdly tight street-level zoom, MIN keeps a rare intercontinental jump readable
 * instead of pulling all the way out to the whole globe. */
const MIN_FIT_ZOOM = 4;
const MAX_FIT_ZOOM = 16;
/** Screen-space padding (px) kept around the leg's two endpoints, so neither sits
 * flush against the viewport edge. */
const FIT_ZOOM_PADDING = 88;

/**
 * The zoom level that keeps both endpoints of the current leg on screen at once — the
 * camera fits to where the marker is headed, not just how fast it's nominally going, so
 * a leg between two far-apart points never runs past the edge of the viewport before the
 * marker visibly arrives (which reads as "point B is gone, we're already at C").
 */
function fitZoomForLeg(map: MapLibreMap, legStart: { lat: number; lng: number }, legEnd: { lat: number; lng: number }): number {
  const bounds = new maplibregl.LngLatBounds([legStart.lng, legStart.lat], [legStart.lng, legStart.lat]);
  bounds.extend([legEnd.lng, legEnd.lat]);
  try {
    const camera = map.cameraForBounds(bounds, { padding: FIT_ZOOM_PADDING });
    if (camera && typeof camera.zoom === "number" && Number.isFinite(camera.zoom)) {
      return Math.min(MAX_FIT_ZOOM, Math.max(MIN_FIT_ZOOM, camera.zoom));
    }
  } catch {
    // cameraForBounds can throw on a degenerate (zero-area) bounds; fall back below.
  }
  return MAX_FIT_ZOOM;
}

/** Per-frame easing factors for the dynamic camera (0-1, higher = snappier). Zooming
 * out reacts quickly so a sudden burst of speed doesn't clip off-screen; zooming back
 * in eases more gently so the camera doesn't feel twitchy while cruising. */
const ZOOM_OUT_EASE = 0.1;
const ZOOM_IN_EASE = 0.045;
const BEARING_EASE = 0.06;
// Camera center deliberately lags behind the marker instead of snapping to it every
// frame — a hard center=marker jumpTo pins the dot dead-center forever, so all the
// visible motion reads as "the map sliding" rather than "the dot traveling". Easing
// the center toward the marker lets the dot actually move across the viewport while
// the map catches up, matching GPS-follow apps (and timelinevisualizer.app's demo).
const CENTER_EASE_STEADY = 0.035;
const CENTER_EASE_DYNAMIC = 0.05;

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

function setHeatmapVisible(map: MapLibreMap, visible: boolean) {
  if (map.getLayer("heatmap-layer")) {
    map.setLayoutProperty("heatmap-layer", "visibility", visible ? "visible" : "none");
  }
}

/** Caps how much a single very long visit (e.g. "home" spanning days in aggregated
 * semantic data) can dominate the heatmap relative to points from actual movement. */
const MAX_VISIT_WEIGHT_HOURS = 24;

/**
 * Builds the point cloud the heatmap layer renders density from: every raw GPS ping and
 * trip path point (weight 1, since their sheer density already reflects time spent —
 * moving slowly or stopped briefly produces more pings per unit distance), plus one
 * point per visit weighted by how long it lasted (since a visit is often just a single
 * lat/lng with no repeated pings of its own to build density from).
 */
function buildHeatmapFeatures(segments: TimelineSegment[], rawTrack: TrackPoint[]) {
  function point(lng: number, lat: number, weight: number) {
    return {
      type: "Feature" as const,
      properties: { weight },
      geometry: { type: "Point" as const, coordinates: [lng, lat] },
    };
  }

  const features = [
    ...rawTrack.map((p) => point(p.lng, p.lat, 1)),
    ...segments.filter(isTrip).flatMap((trip) => trip.path.map((p) => point(p.lng, p.lat, 1))),
    ...segments.filter(isVisit).map((visit) => {
      const hours = (new Date(visit.endTime).getTime() - new Date(visit.startTime).getTime()) / 3600000;
      const weight = Math.min(MAX_VISIT_WEIGHT_HOURS, Math.max(1, Number.isFinite(hours) ? hours : 1));
      return point(visit.location.lng, visit.location.lat, weight);
    }),
  ];

  return { type: "FeatureCollection" as const, features };
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

  if (!options.dynamicCam) {
    map.jumpTo({ center, bearing: 0 });
    return;
  }

  const dynamicCam = options.dynamicCam;
  if (dynamicCam.center === null) dynamicCam.center = center;
  const centerEase = cameraMode === "dynamic" ? CENTER_EASE_DYNAMIC : CENTER_EASE_STEADY;
  dynamicCam.center = [
    dynamicCam.center[0] + (center[0] - dynamicCam.center[0]) * centerEase,
    dynamicCam.center[1] + (center[1] - dynamicCam.center[1]) * centerEase,
  ];

  // Zoom eases toward a speed-appropriate level in both steady and dynamic modes — a
  // constant zoom can't show a leg that jumps far between two sparsely-sampled GPS
  // points (a real-world-fast leg), so it needs to pull back the same way dynamic's
  // camera does. Steady just skips the bearing rotation, keeping north-up framing.
  if (dynamicCam.zoom === null) dynamicCam.zoom = map.getZoom();
  const targetZoom = fitZoomForLeg(map, frame.legStart, frame.legEnd);
  const zoomEase = targetZoom < dynamicCam.zoom ? ZOOM_OUT_EASE : ZOOM_IN_EASE;
  dynamicCam.zoom += (targetZoom - dynamicCam.zoom) * zoomEase;

  if (cameraMode === "steady") {
    map.jumpTo({ center: dynamicCam.center, zoom: dynamicCam.zoom, bearing: 0 });
    return;
  }

  if (frame.bearing !== undefined) {
    dynamicCam.bearing = lerpAngle(dynamicCam.bearing, frame.bearing, BEARING_EASE);
  }

  map.jumpTo({ center: dynamicCam.center, zoom: dynamicCam.zoom, bearing: dynamicCam.bearing });
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

  const heatmapSource = map.getSource("heatmap-points") as GeoJSONSource | undefined;
  heatmapSource?.setData(buildHeatmapFeatures(segments, rawTrack));

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
