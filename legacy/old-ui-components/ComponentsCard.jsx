const BARS = [
  { key: 'gaze', label: 'Gaze', icon: '👁️', gradient: 'linear-gradient(90deg, #7c3aed, #a78bfa)' },
  { key: 'head_pose', label: 'Head Pose', icon: '🧍', gradient: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
  { key: 'blink', label: 'Blink', icon: '😴', gradient: 'linear-gradient(90deg, #06b6d4, #67e8f9)' },
];

export default function ComponentsCard({ components }) {
  return (
    <div className="glass-card p-5 animate-fade-in">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
        Components
      </h2>

      <div className="flex flex-col gap-4">
        {BARS.map(({ key, label, icon, gradient }) => {
          const value = Math.round(components?.[key] ?? 0);
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/70 flex items-center gap-1.5">
                  <span className="text-base">{icon}</span>
                  {label}
                </span>
                <span className="text-sm font-bold text-white/90 tabular-nums">{value}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${value}%`,
                    background: gradient,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
