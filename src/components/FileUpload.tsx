"use client";

import { useCallback, useRef, useState } from "react";
import { parseGoogleTimelineFile } from "@/lib/timeline/parse";
import { TimelineData } from "@/lib/timeline/types";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/components/LocaleProvider";

interface FileUploadProps {
  onLoaded: (data: TimelineData) => void;
}

export default function FileUpload({ onLoaded }: FileUploadProps) {
  const { t } = useLocale();
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
          setError(`${t.upload.error} ${data.warnings[0] ?? ""}`.trim());
          return;
        }
        onLoaded(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read file");
      }
    },
    [onLoaded, t]
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
      className={`glass-panel group relative flex cursor-pointer flex-col items-center gap-4 overflow-hidden px-5 py-10 text-center transition-all duration-300 sm:px-10 sm:py-16 ${
        isDragging
          ? "border-(--accent) bg-(--panel-strong) scale-[1.01]"
          : "hover:border-(--accent)/40 hover:bg-(--panel-strong)"
      }`}
    >
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-30"
        style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
      />

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

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-(--panel-border) bg-(--panel) text-(--accent)">
        <Icon name="upload" className="h-7 w-7" />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-base font-medium text-(--text)">{t.upload.title}</p>
        <p className="max-w-md text-sm text-(--text-muted)">{t.upload.subtitle}</p>
      </div>

      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-(--panel-border) bg-(--panel) px-3 py-1 text-xs text-(--text-muted)">
        <span className="h-1.5 w-1.5 rounded-full bg-(--accent-2)" />
        {t.upload.privacy}
      </div>

      {error && (
        <p className="max-w-md rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
