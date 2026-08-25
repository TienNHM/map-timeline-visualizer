"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { TimelineSegment, TrackPoint } from "@/lib/timeline/types";
import { boundsOf } from "@/lib/timeline/geo";
import { isTrip, isVisit } from "@/lib/timeline/stats";
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
}

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] };

interface OverlayColors {
  accent: string;
  accent2: string;
  isLight: boolean;
}

export default function MapView({ segments, rawTrack = [] }: MapViewProps) {
  const { themeId, isLight, themes } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const segmentsRef = useRef(segments);
  const rawTrackRef = useRef(rawTrack);
  const colorsRef = useRef<OverlayColors>(themeColors(themeId, isLight, themes));
  const hasFitRef = useRef(false);
  const styleGenerationRef = useRef(0);

  useEffect(() => {
    segmentsRef.current = segments;
    rawTrackRef.current = rawTrack;
  }, [segments, rawTrack]);

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
        "circle-stroke-width": 2,
        "circle-stroke-color": colors.isLight ? "#ffffff" : "#0b0b12",
      },
    });
  }
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
