import { useRef, useEffect } from 'react';

export default function VideoPanel({ src, active }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  // Start webcam and send frames if no src and active
  useEffect(() => {
    let stream;
    if (active && !src) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Start sending frames every 200ms
        intervalRef.current = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas) {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
              if (!blob) return;
              const formData = new FormData();
              formData.append('frame', blob, 'frame.jpg');
              fetch('/process_frame', { method: 'POST', body: formData });
            }, 'image/jpeg');
          }
        }, 200);
      });
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [active, src]);

  return (
    <div className="glass-card flex items-center justify-center overflow-hidden min-h-[400px] lg:min-h-[500px] relative animate-fade-in">
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
