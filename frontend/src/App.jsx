import { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import VideoPanel from './components/VideoPanel';
import ScoreCard from './components/ScoreCard';
import ComponentsCard from './components/ComponentsCard';
import DetailsCard from './components/DetailsCard';
import SessionsCard from './components/SessionsCard';
import EyeMechanism from './components/EyeMechanism';
import { useAttentionData } from './hooks/useAttentionData';

export default function App() {
  const [feedActive, setFeedActive] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);

  const data = useAttentionData(feedActive);

  /* ── Webcam ─────────────────────────────────────────── */
  const handleStartWebcam = useCallback(() => {
    setVideoSrc(null);
    setFeedActive(true);
  }, []);

  /* ── Upload ─────────────────────────────────────────── */
  const handleUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('video', file);

      try {
        const res = await fetch('/upload_video', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
          setVideoSrc(json.stream_url);
          setFeedActive(true);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    };
    input.click();
  }, []);

  /* ── Stop ───────────────────────────────────────────── */
  const handleStop = useCallback(async () => {
    try {
      await fetch('/stop_feed', { method: 'POST' });
    } catch {
      /* ignore */
    }
    setFeedActive(false);
    setVideoSrc(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onStart={handleStartWebcam}
        onUpload={handleUpload}
        onStop={handleStop}
        feedActive={feedActive}
      />

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 p-5 pt-3 max-w-[1600px] mx-auto w-full">
        {/* Left: Video */}
        <VideoPanel src={videoSrc} active={feedActive} />

        {/* Right: Sidebar Cards */}
        <aside className="flex flex-col gap-4 stagger">
          <ScoreCard score={data.score} status={data.status} active={feedActive} />
          <EyeMechanism
            gazeDirection={data.gazeDirection}
            gazeScore={data.components?.gaze ?? 0}
            blinkRate={data.blinkRate}
            isActive={feedActive}
          />
          <ComponentsCard components={data.components} />
          <DetailsCard
            gazeDirection={data.gazeDirection}
            headDirection={data.headDirection}
            blinkRate={data.blinkRate}
          />
          <SessionsCard />
        </aside>
      </main>
    </div>
  );
}
