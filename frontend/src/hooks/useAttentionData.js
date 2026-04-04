import { useState, useEffect, useRef } from 'react';

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

  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    async function poll() {
      try {
        const res = await fetch('/api/score');
        const json = await res.json();
        setData({
          score: json.score ?? 50,
          status: json.status ?? 'Initializing',
          components: json.components ?? { gaze: 0, head_pose: 0, blink: 0 },
          blinkRate: json.blink_rate ?? 0,
          gazeDirection: json.gaze_direction ?? 'Unknown',
          headDirection: json.head_direction ?? 'Unknown',
        });
      } catch {
        /* backend unreachable */
      }
    }

    // Immediate first poll
    poll();

    // Then every 500ms
    intervalRef.current = setInterval(poll, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active]);

  return data;
}
