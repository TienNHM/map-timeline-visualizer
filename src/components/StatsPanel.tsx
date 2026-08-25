import { TimelineStats } from "@/lib/timeline/stats";
import { Icon, IconName } from "@/components/Icon";

interface StatsPanelProps {
  stats: TimelineStats;
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
}

const ACTIVITY_COLORS: Record<string, string> = {
  WALKING: "#34d3a8",
  RUNNING: "#34d3a8",
  CYCLING: "#a3e635",
  MOTORCYCLING: "#f97316",
  IN_PASSENGER_VEHICLE: "#8b7cf6",
  IN_BUS: "#f5b83d",
  IN_TAXI: "#f5b83d",
  IN_TRAIN: "#ec6cb9",
  IN_SUBWAY: "#ec6cb9",
  IN_TRAM: "#ec6cb9",
  IN_FERRY: "#38bdf8",
  FLYING: "#38bdf8",
  SAILING: "#38bdf8",
  SKIING: "#38bdf8",
  UNKNOWN: "#6b6b76",
};

const FALLBACK_PALETTE = ["#8b7cf6", "#34d3a8", "#f5b83d", "#ec6cb9", "#38bdf8", "#a3e635"];

function activityColor(activity: string): string {
  if (ACTIVITY_COLORS[activity]) return ACTIVITY_COLORS[activity];
  let hash = 0;
  for (let i = 0; i < activity.length; i++) hash = (hash * 31 + activity.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

function formatActivity(activity: string): string {
  return activity
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const PLACE_LABELS: Record<string, string> = {
  UNKNOWN: "Other place",
  HOME: "Home",
  INFERRED_HOME: "Home",
  WORK: "Work",
  INFERRED_WORK: "Work",
  ALIASED_LOCATION: "Saved place",
  SEARCHED_ADDRESS: "Searched address",
};

function formatPlaceLabel(label: string): string {
  if (PLACE_LABELS[label]) return PLACE_LABELS[label];
  if (/^[A-Z_]+$/.test(label)) return formatActivity(label);
  return label;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const activityEntries = Object.entries(stats.distanceByActivity).sort(
    (a, b) => b[1] - a[1]
  );
  const maxActivityMeters = activityEntries[0]?.[1] || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="route" label="Total distance" value={formatKm(stats.totalDistanceMeters)} />
        <StatCard icon="trips" label="Trips" value={stats.tripCount.toLocaleString()} />
        <StatCard icon="pin" label="Places visited" value={stats.visitCount.toLocaleString()} />
        <StatCard icon="layers" label="Unique places" value={stats.placeVisitCounts.length.toLocaleString()} />
      </div>

      {activityEntries.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
            Distance by activity
          </h3>
          <div className="flex flex-col gap-2.5">
            {activityEntries.map(([activity, meters]) => {
              const color = activityColor(activity);
              return (
                <div key={activity} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
                  />
                  <span className="w-30 shrink-0 truncate text-(--text-muted)">
                    {formatActivity(activity)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--panel-border)">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(meters / maxActivityMeters) * 100}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span className="stat-number w-16 shrink-0 text-right text-(--text)">
                    {formatKm(meters)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.placeVisitCounts.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
            Top places
          </h3>
          <ol className="flex flex-col gap-1">
            {stats.placeVisitCounts.slice(0, 8).map((p, i) => (
              <li
                key={p.label}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-(--panel)"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span className="stat-number w-5 shrink-0 text-xs text-(--text-faint)">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-(--text)">{formatPlaceLabel(p.label)}</span>
                </span>
                <span className="stat-number shrink-0 text-xs text-(--text-muted)">
                  {p.count} {p.count === 1 ? "visit" : "visits"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="glass-panel flex flex-col gap-2.5 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--panel-border) bg-(--panel) text-(--accent)">
        <Icon name={icon} className="h-4.5 w-4.5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="stat-number text-xl font-semibold text-(--text)">{value}</div>
        <div className="text-xs text-(--text-muted)">{label}</div>
      </div>
    </div>
  );
}
