import { useState, useEffect } from 'react';

export default function SessionsCard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        setSessions(data);
      } catch {
        /* offline or no backend */
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();

    // Refresh every 10s
    const id = setInterval(fetchSessions, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
        Sessions
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-white/10 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-white/30">No sessions yet</p>
          <p className="text-xs text-white/15 mt-1">Start a webcam feed to create one</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-white/60 capitalize">
                  {s.source}
                </span>
                <span className="text-[0.65rem] text-white/25">
                  {formatTime(s.start_time)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white/80 tabular-nums">
                  {Math.round(s.avg_score ?? 0)}%
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: s.status === 'active' ? '#22c55e' : 'rgba(255,255,255,0.15)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
