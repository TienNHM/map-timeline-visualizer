"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { TimelineSegment, TrackPoint } from "@/lib/timeline/types";
import { boundsOf } from "@/lib/timeline/geo";
import { isTrip, isVisit } from "@/lib/timeline/stats";

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

// Free, no-key-required dark vector basemap (OSM data via CARTO). Chosen over a CSS
// invert()-filter hack because MapLibre renders every layer — basemap and our own
// trip/visit overlays alike — onto a single canvas, so a filter would distort our colors too.
const DARK_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function MapView({ segments, rawTrack = [] }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE_URL,
      center: [0, 0],
      zoom: 2,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("raw-track", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "raw-track-line",
        type: "line",
        source: "raw-track",
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.5,
          "line-opacity": 0.25,
          "line-dasharray": [1, 1.5],
        },
      });

      map.addSource("trips", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "trips-line",
        type: "line",
        source: "trips",
        paint: {
          "line-color": "#8b7cf6",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });

      map.addSource("visits", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "visits-circle",
        type: "circle",
        source: "visits",
        paint: {
          "circle-radius": 5,
          "circle-color": "#34d3a8",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0b0b12",
        },
      });

      mapRef.current = map;
      renderData(map, segments, rawTrack);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      renderData(mapRef.current, segments, rawTrack);
    }
  }, [segments, rawTrack]);

  return <div ref={containerRef} className="map-dark-tiles h-full min-h-100 w-full" />;
}

function renderData(map: MapLibreMap, segments: TimelineSegment[], rawTrack: TrackPoint[]) {
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
    rawTrackSource?.setData({ type: "FeatureCollection", features: [] });
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
