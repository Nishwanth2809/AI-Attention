export const EMPTY_METRICS = { score: 0, face: false, gaze: 0, posture: 0, eyes: 0, status: 'Ready when you are' };
export function createSession(title, mode, targetMinutes, now = Date.now()) {
  return { id: crypto.randomUUID(), title: title.trim().slice(0, 80) || 'A little space to focus', mode,
    targetMinutes: Math.max(1, Math.min(120, Number(targetMinutes) || 25)), startedAt: new Date(now).toISOString(),
    elapsed: 0, samples: [], events: [], scoreSum: 0, sampleCount: 0, focusedMs: 0, longestStreak: 0, currentStreak: 0 };
}
export function recordSample(session, metrics) {
  const previous = session.samples.at(-1);
  const delta = Math.min(2000, Math.max(0, session.elapsed - (previous?.elapsed || 0)));
  if (metrics.face && metrics.score >= 65) {
    session.focusedMs += delta;
    session.currentStreak += delta;
    session.longestStreak = Math.max(session.longestStreak, session.currentStreak);
  } else session.currentStreak = 0;
  session.scoreSum += metrics.score;
  session.sampleCount += 1;
  session.samples.push({ elapsed: session.elapsed, score: Math.round(metrics.score), face: metrics.face });
  // Keep up to two hours of one-second observations, with all-session aggregates.
  if (session.samples.length > 7200) session.samples.shift();
}
export function completeSession(session, reason = 'finished') {
  return { ...session, endedAt: new Date().toISOString(), reason,
    average: session.sampleCount ? Math.round(session.scoreSum / session.sampleCount) : 0,
    focusPercent: session.elapsed ? Math.min(100, Math.round(session.focusedMs / session.elapsed * 100)) : 0 };
}
export function demoMetrics(seconds) {
  const segment = Math.floor(seconds / 15) % 4;
  const score = segment === 1 ? 34 + Math.sin(seconds) * 7 : 83 + Math.sin(seconds / 2) * 8;
  return { score: Math.round(score), face: true, gaze: segment === 1 ? 28 : 91,
    posture: segment === 1 ? 55 : 86, eyes: 94, status: score >= 65 ? 'In the zone' : 'A little distracted' };
}
export function formatDuration(ms, clock = false) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return clock ? `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}
export function exportSession(session) {
  const rows = [['elapsed_seconds', 'focus_score', 'face_present'], ...session.samples.map(p => [(p.elapsed / 1000).toFixed(1), p.score, p.face])];
  return rows.map(row => row.join(',')).join('\n');
}
export function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
