"use client";

import { useCallback, useRef, useState } from "react";
import { parseGoogleTimelineFile } from "@/lib/timeline/parse";
import { TimelineData } from "@/lib/timeline/types";

interface FileUploadProps {
  onLoaded: (data: TimelineData) => void;
}

export default function FileUpload({ onLoaded }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const data = parseGoogleTimelineFile(json);
        if (data.segments.length === 0 && data.rawTrack.length === 0) {
          setError(
            "Parsed the file but found no usable location data. " +
              (data.warnings[0] ?? "")
          );
          return;
        }
        onLoaded(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read file");
      }
    },
    [onLoaded]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
          : "border-gray-300 dark:border-gray-700 hover:border-blue-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <p className="text-sm font-medium">
        Drop your Google Maps Timeline export (JSON) here, or click to browse
      </p>
      <p className="text-xs text-gray-500">
        Supports the on-device Timeline export, legacy Semantic Location
        History, and raw Records.json. Nothing is uploaded — parsing happens
        entirely in your browser.
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
