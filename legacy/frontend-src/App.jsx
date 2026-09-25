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
  const [error, setError] = useState('');
  const [videoSrc, setVideoSrc] = useState(null);

  const data = useAttentionData(feedActive);

  /* ── Webcam ─────────────────────────────────────────── */
  const handleStartWebcam = useCallback(() => {
    setError('');
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
        if (!res.ok || !json.success) throw new Error(json.error || 'Upload failed.');
        setError('');
        if (json.success) {
          setVideoSrc(json.stream_url);
          setFeedActive(true);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    input.click();
  }, []);

  /* ── Stop ───────────────────────────────────────────── */
  const handleStop = useCallback(async () => {
    // Unmount camera capture first; VideoPanel stops its own session by ID.
    setFeedActive(false);
    setVideoSrc(null);
    if (videoSrc) {
      try {
        const response = await fetch('/stop_feed', { method: 'POST' });
        if (!response.ok) throw new Error('Unable to stop the server stream.');
      } catch (err) { setError(err.message); }
    }
  }, [videoSrc]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onStart={handleStartWebcam}
        onUpload={handleUpload}
        onStop={handleStop}
        feedActive={feedActive}
      />

      {error && <div role="alert" className="mx-5 rounded-xl bg-red-950/80 p-3 text-sm text-white">{error}</div>}
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
