const ITEMS = [
  { label: 'Gaze Direction', icon: '👁️', key: 'gaze' },
  { label: 'Head Direction', icon: '🧭', key: 'head' },
  { label: 'Blinks / min', icon: '💧', key: 'blink' },
];

export default function DetailsCard({ gazeDirection, headDirection, blinkRate }) {
  const values = {
    gaze: gazeDirection || '—',
    head: headDirection || '—',
    blink: blinkRate != null ? blinkRate : '—',
  };

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
        Details
      </h2>

      <div className="flex flex-col gap-3">
        {ITEMS.map(({ label, icon, key }) => (
          <div
            key={key}
            className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-sm text-white/50 flex items-center gap-2">
              <span className="text-base">{icon}</span>
              {label}
            </span>
            <span className="text-sm font-semibold text-white/80 tabular-nums">
              {values[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
