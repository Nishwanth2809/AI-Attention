const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getStatusConfig(status) {
  switch (status) {
    case 'Focused':
      return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', label: '🟢 Focused' };
    case 'Distracted':
      return { color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)', label: '🟡 Distracted' };
    case 'Drowsy':
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: '🔴 Drowsy' };
    default:
      return { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.25)', label: '⏳ ' + status };
  }
}

export default function ScoreCard({ score, status, active }) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const cfg = getStatusConfig(status);

  return (
    <div className={`glass-card p-5 animate-fade-in ${active ? 'pulse-glow' : ''}`}>
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
        Attention Score
      </h2>

      <div className="flex flex-col items-center gap-3">
        {/* Ring */}
        <div className="relative w-[140px] h-[140px]">
          <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-[-90deg]">
            {/* Track */}
            <circle
              cx="70" cy="70" r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="10"
            />
            {/* Progress */}
            <circle
              cx="70" cy="70" r={RADIUS}
              fill="none"
              stroke={`url(#scoreGradient)`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className="score-ring-circle"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          {/* Center Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {clamped}
            </span>
            <span className="text-[0.65rem] font-medium text-white/30 -mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}
