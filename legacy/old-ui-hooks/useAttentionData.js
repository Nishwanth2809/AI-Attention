import { useState, useEffect } from 'react';

/**
 * Custom hook that polls /api/score while a feed is active.
 * Returns the latest attention data.
 */
export function useAttentionData(active) {
  const [data, setData] = useState({
    score: 50,
    status: 'Initializing',
    components: { gaze: 0, head_pose: 0, blink: 0 },
    blinkRate: 0,
    gazeDirection: 'Unknown',
    headDirection: 'Unknown',
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer;
    const controller = new AbortController();

    async function poll() {
      try {
        const res = await fetch('/api/score', { signal: controller.signal });
        if (!res.ok) throw new Error('Score request failed');
        const json = await res.json();
        if (cancelled) return;
        setData({
          score: json.score ?? 50,
          status: json.status ?? 'Initializing',
          components: json.components ?? { gaze: 0, head_pose: 0, blink: 0 },
          blinkRate: json.blink_rate ?? 0,
          gazeDirection: json.gaze_direction ?? 'Unknown',
          headDirection: json.head_direction ?? 'Unknown',
        });
      } catch {
        /* Retry on the next poll unless the component was stopped. */
      } finally {
        if (!cancelled) timer = setTimeout(poll, 500);
      }
    }
    poll();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [active]);

  return data;
}
