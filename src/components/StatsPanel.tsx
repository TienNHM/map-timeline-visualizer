import { TimelineStats } from "@/lib/timeline/stats";

interface StatsPanelProps {
  stats: TimelineStats;
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatActivity(activity: string): string {
  return activity
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const activityEntries = Object.entries(stats.distanceByActivity).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total distance" value={formatKm(stats.totalDistanceMeters)} />
        <StatCard label="Trips" value={String(stats.tripCount)} />
        <StatCard label="Places visited" value={String(stats.visitCount)} />
        <StatCard
          label="Unique places"
          value={String(stats.placeVisitCounts.length)}
        />
      </div>

      {activityEntries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Distance by activity</h3>
          <div className="flex flex-col gap-1">
            {activityEntries.map(([activity, meters]) => (
              <div key={activity} className="flex items-center gap-2 text-sm">
                <span className="w-32 shrink-0 text-gray-600 dark:text-gray-400">
                  {formatActivity(activity)}
                </span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2"
                    style={{
                      width: `${(meters / (activityEntries[0][1] || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-right">{formatKm(meters)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.placeVisitCounts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Top places</h3>
          <ol className="flex flex-col gap-1 text-sm">
            {stats.placeVisitCounts.slice(0, 8).map((p) => (
              <li key={p.label} className="flex justify-between">
                <span className="truncate">{p.label}</span>
                <span className="text-gray-500">{p.count} visits</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
