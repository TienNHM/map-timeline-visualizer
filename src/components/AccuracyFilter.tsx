"use client";

interface AccuracyFilterProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

const DEFAULT_LIMIT = 100;

export default function AccuracyFilter({ value, onChange }: AccuracyFilterProps) {
  const enabled = value !== null;

  return (
    <div className="flex items-center gap-2 border-t border-(--panel-border) pt-3 text-xs">
      <label className="flex items-center gap-1.5 text-(--text-muted)">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked ? DEFAULT_LIMIT : null)}
          className="h-3.5 w-3.5 accent-(--accent)"
        />
        Accuracy limit (meters)
      </label>
      <input
        type="number"
        min={1}
        step={1}
        disabled={!enabled}
        value={value ?? DEFAULT_LIMIT}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n > 0) onChange(n);
        }}
        className="stat-number w-20 rounded-md border border-(--panel-border) bg-(--panel) px-2 py-1 text-(--text) disabled:opacity-40"
      />
      <span className="text-(--text-faint)">
        {enabled ? "Drops GPS pings reported less accurate than this." : "No limit — all GPS pings are used."}
      </span>
    </div>
  );
}
