const PREFIX = 'attn.v2.';
export function load(key, fallback, validate = () => true) {
  try { const item = JSON.parse(localStorage.getItem(PREFIX + key)); return item !== null && validate(item) ? item : fallback; }
  catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function validSession(s) {
  return s && typeof s.id === 'string' && typeof s.title === 'string' && ['demo', 'camera'].includes(s.mode)
    && Number.isFinite(s.elapsed) && Number.isFinite(s.average) && Number.isFinite(s.focusedMs)
    && Array.isArray(s.samples) && s.samples.every(p => Number.isFinite(p.score) && Number.isFinite(p.elapsed))
    && Array.isArray(s.events) && typeof s.startedAt === 'string';
}
export function loadSessions() { return load('sessions', [], Array.isArray).filter(validSession).slice(0, 30); }
