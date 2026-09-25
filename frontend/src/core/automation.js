export const DEFAULT_RULES = [
  { id: 'refocus', name: 'A gentle nudge', description: 'Catch a distraction before it becomes a detour.', trigger: 'distracted', threshold: 50, duration: 6, cooldown: 45, action: 'coach', enabled: true },
  { id: 'away', name: 'Step away, guilt-free', description: 'Pause the session when you leave your desk.', trigger: 'away', threshold: 0, duration: 12, cooldown: 60, action: 'pause', enabled: true },
  { id: 'break', name: 'Make room for a break', description: 'A little breathing room goes a long way.', trigger: 'interval', threshold: 0, duration: 1200, cooldown: 60, action: 'coach', enabled: true },
  { id: 'streak', name: 'Celebrate your flow', description: 'Recognize a stretch of uninterrupted focus.', trigger: 'focused', threshold: 75, duration: 60, cooldown: 300, action: 'coach', enabled: true },
];
export const TRIGGERS = { distracted: 'Focus drops below', away: 'No face detected', interval: 'Session time reaches', focused: 'Focus stays above' };
export const ACTIONS = { coach: 'Show a coach card', notification: 'Desktop notification', pause: 'Pause the session' };
export function normalizeRules(value) {
  if (!Array.isArray(value)) return DEFAULT_RULES.map(r => ({ ...r }));
  return DEFAULT_RULES.map(base => {
    const item = value.find(r => r?.id === base.id) || base;
    const bound = (key, low, high) => Number.isFinite(Number(item[key])) ? Math.min(high, Math.max(low, Number(item[key]))) : base[key];
    return { ...base, enabled: typeof item.enabled === 'boolean' ? item.enabled : base.enabled,
      threshold: bound('threshold', 0, 100), duration: bound('duration', 1, 7200), cooldown: bound('cooldown', 1, 3600),
      action: Object.hasOwn(ACTIONS, item.action) ? item.action : base.action };
  });
}
export class AutomationEngine {
  constructor() { this.states = new Map(); }
  resetContinuity() { for (const state of this.states.values()) state.since = null; }
  evaluate(rules, sample, elapsedMs) {
    const events = [];
    for (const rule of rules) {
      let state = this.states.get(rule.id);
      const signature = JSON.stringify(rule);
      if (!state || state.signature !== signature) {
        state = { since: null, lastRun: -Infinity, interval: 0, signature };
        this.states.set(rule.id, state);
      }
      if (!rule.enabled) { state.since = null; continue; }
      const seconds = elapsedMs / 1000;
      const matched = rule.trigger === 'distracted' ? sample.face && sample.score < rule.threshold
        : rule.trigger === 'focused' ? sample.face && sample.score >= rule.threshold
        : rule.trigger === 'away' ? !sample.face : false;
      const bucket = Math.floor(seconds / rule.duration);
      let ready = false;
      if (rule.trigger === 'interval') ready = bucket > state.interval && bucket > 0;
      else if (matched) {
        state.since ??= seconds;
        ready = seconds - state.since >= rule.duration;
      } else state.since = null;
      if (!ready || seconds - state.lastRun < rule.cooldown) continue;
      state.lastRun = seconds;
      state.since = seconds;
      state.interval = bucket;
      const messages = {
        distracted: 'One thing at a time. Bring your attention back to your intention.',
        away: 'Looks like you stepped away. Your session can wait for you.',
        interval: 'Unclench your shoulders, look into the distance, and take a breath.',
        focused: 'You are building momentum. Keep going at your own pace.',
      };
      events.push({ id: crypto.randomUUID(), ruleId: rule.id, title: rule.name, message: messages[rule.trigger],
        action: rule.action, elapsed: elapsedMs, timestamp: new Date().toISOString() });
    }
    return events;
  }
}
