import { useEffect, useRef, useState } from 'react';
import { scoreLandmarks } from './signals';
export function useCamera(enabled, onMetrics, onError) {
  const videoRef = useRef(null);
  const callbacks = useRef({ onMetrics, onError });
  callbacks.current = { onMetrics, onError };
  const [state, setState] = useState('off');
  useEffect(() => {
    if (!enabled) { setState('off'); return; }
    let stopped = false, stream, worker, timer, watchdog, lastTime = -1, score = 50;
    const cleanup = () => {
      stopped = true; clearTimeout(timer); clearTimeout(watchdog);
      stream?.getTracks().forEach(track => track.stop()); worker?.terminate();
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    const fail = message => { if (!stopped) { cleanup(); setState('error'); callbacks.current.onError(message); } };
    async function capture() {
      if (stopped) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.currentTime === lastTime) { timer = setTimeout(capture, 100); return; }
      lastTime = video.currentTime;
      try {
        const bitmap = await createImageBitmap(video, { resizeWidth: 480, resizeHeight: Math.round(480 * video.videoHeight / video.videoWidth) });
        if (stopped) { bitmap.close(); return; }
        watchdog = setTimeout(() => fail('Camera analysis stalled. Resume the session to try again.'), 15000);
        worker.postMessage({ type: 'frame', bitmap, timestamp: performance.now() }, [bitmap]);
      } catch { fail('This browser could not analyze camera frames. Try a recent Chrome or Edge browser.'); }
    }
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost. You can still try the demo.');
        setState('loading');
        worker = new Worker(`${import.meta.env.BASE_URL}vision-worker.js`);
        watchdog = setTimeout(() => fail('The vision model took too long to load. Check your connection and resume to retry.'), 60000);
        worker.onerror = () => fail('The vision model could not load. Check your connection or try the demo.');
        worker.onmessage = async ({ data }) => {
          if (stopped) return;
          clearTimeout(watchdog);
          if (data.type === 'error') { fail('Camera analysis is unavailable. Check your connection and resume to retry.'); return; }
          if (data.type === 'ready') {
            try {
              setState('permission');
              stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
              if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
              stream.getVideoTracks()[0].addEventListener('ended', () => fail('Your camera disconnected. Reconnect it and resume.'));
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
              if (!stopped) { setState('ready'); capture(); }
            } catch (error) { fail(error.name === 'NotAllowedError' ? 'Camera permission was declined. Allow camera access and resume, or end this session and try the demo.' : 'Could not open your camera. Check that another app is not using it.'); }
          } else if (data.type === 'result') {
            const metrics = scoreLandmarks(data.points, data.blends, score);
            score = metrics.score;
            callbacks.current.onMetrics(metrics);
            timer = setTimeout(capture, 80);
          }
        };
        worker.postMessage({ type: 'init' });
      } catch (error) { fail(error.message); }
    }
    start();
    return cleanup;
  }, [enabled]);
  return { videoRef, cameraState: state };
}
