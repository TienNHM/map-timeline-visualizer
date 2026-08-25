"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TimelineSegment } from "@/lib/timeline/types";
import { advanceReplay, buildReplayTrack, ReplayFrame } from "@/lib/timeline/replay";

/** Wall-clock time a full replay takes at 1x speed, regardless of how long the trip actually spanned. */
const BASE_PLAYBACK_MS = 20000;
const SPEEDS = [1, 2, 4, 8] as const;

interface ReplayControlsProps {
  segments: TimelineSegment[];
  onFrame: (frame: ReplayFrame | null) => void;
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

export default function ReplayControls({ segments, onFrame }: ReplayControlsProps) {
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M7 4.5v15l13-7.5-13-7.5Z" />
          </svg>
        )}
      </button>

      <button
        onClick={handleRestart}
        aria-label="Restart replay"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:text-(--text)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M4 9a8 8 0 1 1 2.34 6.06" />
        </svg>
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
            className="h-full rounded-full"
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

      <button
        onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length])}
        className="stat-number shrink-0 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
      >
        {speed}x
      </button>
    </div>
  );
}
