import { useState, useEffect, useRef, useCallback } from 'react';
import { AutomationEngine, normalizeRules } from '../../core/automation';
import { createSession, recordSample, completeSession, demoMetrics, EMPTY_METRICS } from '../../core/session';
import { load, save, loadSessions } from '../../core/storage';
import { useCamera } from './useCamera';
export function useFocus() {
  const [rules, setRules] = useState(() => normalizeRules(load('rules', null)));
  const [sessions, setSessions] = useState(loadSessions);
  const [phase, setPhase] = useState('idle');
  const [live, setLive] = useState(null);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [notice, setNotice] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const session = useRef(null), engine = useRef(new AutomationEngine()), latest = useRef(EMPTY_METRICS), lastMetric = useRef(0);
  const onMetrics = useCallback(value => { latest.current = value; lastMetric.current = performance.now(); setMetrics(value); }, []);
  const pause = useCallback(() => {
    setPhase('paused'); engine.current.resetContinuity();
    if (session.current) session.current.currentStreak = 0;
  }, []);
  const onCameraError = useCallback(message => { pause(); setNotice({ title: 'Let’s reconnect', message, error: true }); }, [pause]);
  const camera = useCamera(phase === 'running' && live?.mode === 'camera', onMetrics, onCameraError);
  useEffect(() => { if (!save('rules', rules)) setNotice({ title: 'Could not save rules', message: 'Browser storage is unavailable. Changes last for this visit only.', error: true }); }, [rules]);
  useEffect(() => { if (!save('sessions', sessions)) setNotice({ title: 'Your storage is full', message: 'Export your reports, then remove old sessions. This visit’s data is still available.', error: true }); }, [sessions]);
  const start = useCallback((mode, title, minutes) => {
    if (session.current) return;
    const next = createSession(title, mode, minutes);
    session.current = next; engine.current = new AutomationEngine(); latest.current = EMPTY_METRICS;
    setMetrics(EMPTY_METRICS); setLive({ ...next }); setNotice(null); setPhase('running');
  }, []);
  const finish = useCallback((reason = 'finished') => {
    if (!session.current) return;
    const report = completeSession(session.current, reason);
    setSessions(previous => [report, ...previous].slice(0, 30));
    setSelectedReport(report.id);
    setNotice({ title: reason === 'goal' ? 'You made space for what matters.' : 'A little progress, saved.', message: 'Your session report is ready in Reports.' });
    session.current = null; setLive(null); setPhase('idle');
  }, []);
  const resume = useCallback(() => { setNotice(null); lastMetric.current = 0; setPhase('running'); }, []);
  useEffect(() => {
    if (phase !== 'running' || !live || (live.mode === 'camera' && camera.cameraState !== 'ready')) return;
    let lastTick = performance.now();
    const timer = setInterval(() => {
      const active = session.current;
      if (!active) return;
      const now = performance.now();
      const delta = now - lastTick; lastTick = now;
      // A suspended device must not receive unobserved focus credit.
      if (delta > 5000) { pause(); setNotice({ title: 'Welcome back', message: 'We paused while your device was inactive. Resume when you’re ready.' }); return; }
      if (active.mode === 'camera' && (!lastMetric.current || now - lastMetric.current > 3000)) return;
      active.elapsed += delta;
      const value = active.mode === 'demo' ? demoMetrics(active.elapsed / 1000) : latest.current;
      latest.current = value; setMetrics(value); recordSample(active, value);
      const events = engine.current.evaluate(rules, value, active.elapsed);
      for (const event of events) {
        let delivery = 'Coach card shown';
        if (event.action === 'pause') { pause(); delivery = 'Session paused'; }
        if (event.action === 'notification') {
          if ('Notification' in window && Notification.permission === 'granted') {
            try { new Notification(event.title, { body: event.message }); delivery = 'Notification requested'; }
            catch { delivery = 'Coach card shown • desktop notification unavailable'; }
          } else delivery = 'Coach card shown • desktop permission not granted';
        }
        active.events.unshift({ ...event, delivery });
        active.events = active.events.slice(0, 300);
        setNotice({ title: event.title, message: event.message });
      }
      setLive({ ...active, samples: [...active.samples], events: [...active.events] });
      if (active.elapsed >= active.targetMinutes * 60000) finish('goal');
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, live?.id, live?.mode, camera.cameraState, rules, finish, pause]);
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden && session.current && phase === 'running') {
        pause(); setNotice({ title: 'Paused while you’re away', message: 'We only count focus when this app is visible. Resume when you’re ready.' });
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [phase, pause]);
  return { rules, setRules, sessions, setSessions, phase, live, metrics, notice, setNotice, start, pause, resume, finish,
    selectedReport, setSelectedReport, ...camera };
}
