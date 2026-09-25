import { useRef, useEffect, useState } from 'react';

export default function VideoPanel({ src, active }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active || src) return;
    let cancelled = false;
    let stream;
    let timer;
    let sessionId;
    const controller = new AbortController();
    setError('');

    async function stopSession() {
      if (sessionId === undefined) return;
      const id = sessionId;
      sessionId = undefined;
      try {
        await fetch('/stop_feed', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: id }), keepalive: true,
        });
      } catch { /* A connection failure is already shown by the capture loop. */ }
    }

    async function capture() {
      if (cancelled) return;
      const started = performance.now();
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video?.readyState >= 2 && video.videoWidth && canvas) {
          const scale = Math.min(1, 640 / video.videoWidth);
          const width = Math.round(video.videoWidth * scale);
          const height = Math.round(video.videoHeight * scale);
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          canvas.getContext('2d').drawImage(video, 0, 0, width, height);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
          if (cancelled) return;
          if (blob) {
            const form = new FormData();
            form.append('frame', blob, 'frame.jpg');
            form.append('session_id', sessionId);
            const response = await fetch('/process_frame', {
              method: 'POST', body: form, signal: controller.signal,
            });
            if (!response.ok) throw new Error('Frame processing failed. Stop and restart monitoring.');
          }
        }
        // Backpressure: never queue another frame while a request is in flight.
        if (!cancelled) timer = setTimeout(capture, Math.max(0, 200 - (performance.now() - started)));
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          stream?.getTracks().forEach(track => track.stop());
          await stopSession();
        }
      }
    }

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access requires HTTPS or localhost.');
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        // Do not abort session creation: its response is needed to clean up a late session.
        const response = await fetch('/start_feed', { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to start monitoring.');
        sessionId = result.session_id;
        if (cancelled) { await stopSession(); return; }
        videoRef.current.srcObject = stream;
        await capture();
      } catch (err) {
        stream?.getTracks().forEach(track => track.stop());
        if (!cancelled) setError(err.message || 'Unable to access the camera.');
        await stopSession();
      }
    }
    start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
      stream?.getTracks().forEach(track => track.stop());
      void stopSession();
    };
  }, [active, src]);

  return (
    <div className="glass-card flex items-center justify-center overflow-hidden min-h-[400px] lg:min-h-[500px] relative animate-fade-in">
      {active && !src && error && (
        <div role="alert" className="absolute bottom-4 left-4 right-4 z-10 rounded-xl bg-red-950/90 p-4 text-sm text-white">{error}</div>
      )}
      {active && !src ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            width={640}
            height={480}
            className="w-full h-full object-contain rounded-[14px]"
            style={{ background: '#111' }}
          />
          <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />
          {/* Live indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-white/90">LIVE</span>
          </div>
        </>
      ) : active && src ? (
        <>
          <img
            id="video-stream"
            src={src}
            alt="Attention monitoring video feed"
            className="w-full h-full object-contain rounded-[14px]"
          />
          {/* Live indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-white/90">LIVE</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center p-8">
          {/* Placeholder icon */}
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-2">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
              <path d="m23 7-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <p className="text-sm text-white/40 font-medium max-w-[280px] leading-relaxed">
            Start webcam or upload a video to begin monitoring
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-white/25">
              <span className="w-1 h-1 rounded-full bg-purple-500/40" />
              Eye Gaze
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/25">
              <span className="w-1 h-1 rounded-full bg-blue-500/40" />
              Head Pose
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/25">
              <span className="w-1 h-1 rounded-full bg-cyan-500/40" />
              Blink Rate
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
