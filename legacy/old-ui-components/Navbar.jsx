export default function Navbar({ onStart, onUpload, onStop, feedActive }) {
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-navy-900/80 backdrop-blur-md sticky top-0 z-50">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">👁️</span>
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Attention Monitor
        </h1>
        <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 ml-1">
          AI
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <button
          id="btn-start-webcam"
          className="btn btn-primary"
          onClick={onStart}
          disabled={feedActive}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m23 7-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Start Webcam
        </button>

        <button
          id="btn-upload-video"
          className="btn btn-secondary"
          onClick={onUpload}
          disabled={feedActive}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Video
        </button>

        <button
          id="btn-stop"
          className="btn btn-danger"
          onClick={onStop}
          disabled={!feedActive}
          style={{ opacity: feedActive ? 1 : 0.4 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
          Stop
        </button>
      </div>
    </nav>
  );
}
