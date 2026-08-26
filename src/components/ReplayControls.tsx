"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TimelineSegment } from "@/lib/timeline/types";
import { advanceReplay, buildReplayTrack, CAMERA_MODES, CameraMode, ReplayFrame } from "@/lib/timeline/replay";
import Dropdown, { DropdownOption } from "@/components/Dropdown";
import { Icon, IconName } from "@/components/Icon";

/** Wall-clock time a full replay takes at 1x speed, regardless of how long the trip actually spanned. */
const BASE_PLAYBACK_MS = 20000;
const SPEEDS = [1, 2, 4, 8] as const;
const SPEED_OPTIONS: DropdownOption<string>[] = SPEEDS.map((s) => ({
  value: String(s),
  label: `${s}x speed`,
  description: `Full replay takes ~${(BASE_PLAYBACK_MS / 1000 / s).toLocaleString(undefined, { maximumFractionDigits: 1 })}s`,
}));

const CAMERA_MODE_ICON: Record<CameraMode, IconName> = {
  fixed: "cameraFixed",
  steady: "cameraSteady",
  dynamic: "cameraDynamic",
};

const CAMERA_MODE_OPTIONS: DropdownOption<CameraMode>[] = CAMERA_MODES.map((m) => ({
  value: m.id,
  label: m.label,
  description: m.description,
  icon: <Icon name={CAMERA_MODE_ICON[m.id]} className="h-3.5 w-3.5 shrink-0" />,
}));

interface ReplayControlsProps {
  segments: TimelineSegment[];
  onFrame: (frame: ReplayFrame | null) => void;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReplayControls({ segments, onFrame, cameraMode, onCameraModeChange }: ReplayControlsProps) {
  const track = useMemo(() => buildReplayTrack(segments), [segments]);
  const startMs = track[0]?.timeMs ?? 0;
  const endMs = track[track.length - 1]?.timeMs ?? 0;
  const spanMs = Math.max(endMs - startMs, 1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<number>(SPEEDS[0]);

  const simMsRef = useRef(startMs);
  const cursorRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  function clearTimer() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  // Deliberate reset whenever the underlying (date-filtered) data changes — the
  // in-progress playback position and cursor no longer make sense against a
  // different track, so this intentionally re-synchronizes state to match it.
  useEffect(() => {
    clearTimer();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPlaying(false);
    setProgress(0);
    simMsRef.current = startMs;
    cursorRef.current = 0;
    onFrame(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  useEffect(() => clearTimer, []);

  function tick(now: number) {
    const dtWall = lastFrameTimeRef.current ? now - lastFrameTimeRef.current : 0;
    lastFrameTimeRef.current = now;

    const deltaSim = (spanMs * dtWall * speedRef.current) / BASE_PLAYBACK_MS;
    simMsRef.current += deltaSim;

    if (simMsRef.current >= endMs) {
      const result = advanceReplay(track, endMs, cursorRef.current);
      if (result) onFrame(result.frame);
      setProgress(1);
      clearTimer();
      setIsPlaying(false);
      return;
    }

    const result = advanceReplay(track, simMsRef.current, cursorRef.current);
    if (result) {
      cursorRef.current = result.nextIndex;
      onFrame(result.frame);
      setProgress((simMsRef.current - startMs) / spanMs);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  function handlePlayPause() {
    if (track.length < 2) return;
    if (isPlaying) {
      clearTimer();
      setIsPlaying(false);
      return;
    }
    if (simMsRef.current >= endMs) {
      simMsRef.current = startMs;
      cursorRef.current = 0;
      setProgress(0);
    }
    setIsPlaying(true);
    lastFrameTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }

  function handleRestart() {
    clearTimer();
    setIsPlaying(false);
    simMsRef.current = startMs;
    cursorRef.current = 0;
    setProgress(0);
    onFrame(null);
  }

  function handleSeek(fraction: number) {
    clearTimer();
    setIsPlaying(false);
    const target = startMs + fraction * spanMs;
    simMsRef.current = target;
    cursorRef.current = 0;
    const result = advanceReplay(track, target, 0);
    if (result) {
      cursorRef.current = result.nextIndex;
      onFrame(result.frame);
    }
    setProgress(fraction);
  }

  if (track.length < 2) {
    return null;
  }

  const currentMs = startMs + progress * spanMs;

  return (
    <div className="flex items-center gap-3 border-t border-(--panel-border) pt-3">
      <button
        onClick={handlePlayPause}
        aria-label={isPlaying ? "Pause replay" : "Play replay"}
        className="accent-fill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
      >
        <Icon name={isPlaying ? "pause" : "play"} className="h-4 w-4" />
      </button>

      <button
        onClick={handleRestart}
        aria-label="Restart replay"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:text-(--text)"
      >
        <Icon name="restart" className="h-4 w-4" />
      </button>

      <div className="flex-1">
        <div
          className="relative h-1.5 cursor-pointer overflow-hidden rounded-full bg-(--panel-border)"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleSeek(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
          }}
        >
          <div
            className="accent-fill h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
            }}
          />
        </div>
        <div className="mt-1 text-[11px] text-(--text-faint)">
          <span className="stat-number text-(--text-muted)">{formatTime(currentMs)}</span>
        </div>
      </div>

      <div className="hidden sm:block">
        <Dropdown
          value={cameraMode}
          options={CAMERA_MODE_OPTIONS}
          onChange={onCameraModeChange}
          menuLabel="Camera"
          renderTrigger={(current) => (
            <>
              <Icon name={CAMERA_MODE_ICON[current.value]} className="h-3.5 w-3.5 shrink-0" />
              <span>{current.label}</span>
            </>
          )}
        />
      </div>

      <Dropdown
        value={String(speed)}
        options={SPEED_OPTIONS}
        onChange={(v) => setSpeed(Number(v))}
        menuLabel="Playback speed"
        triggerClassName="stat-number flex items-center gap-1.5 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
        renderTrigger={() => (
          <>
            <Icon name="speed" className="h-3.5 w-3.5 shrink-0" />
            <span>{speed}x</span>
          </>
        )}
      />
    </div>
  );
}
