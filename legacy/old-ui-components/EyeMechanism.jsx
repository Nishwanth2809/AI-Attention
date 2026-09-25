import { useMemo } from 'react';

/**
 * Animated eye mechanism that visually tracks gaze direction.
 * The iris/pupil moves to reflect where the user is looking.
 */

function getIrisOffset(direction) {
  const d = (direction || '').toLowerCase();
  // Map gaze directions to (x, y) iris displacement
  if (d.includes('left') && d.includes('up'))    return { x: -6, y: -4 };
  if (d.includes('right') && d.includes('up'))   return { x: 6, y: -4 };
  if (d.includes('left') && d.includes('down'))  return { x: -6, y: 4 };
  if (d.includes('right') && d.includes('down')) return { x: 6, y: 4 };
  if (d.includes('left'))   return { x: -8, y: 0 };
  if (d.includes('right'))  return { x: 8, y: 0 };
  if (d.includes('up'))     return { x: 0, y: -6 };
  if (d.includes('down'))   return { x: 0, y: 6 };
  return { x: 0, y: 0 }; // Center / Forward
}

function getStatusColor(gazeScore) {
  if (gazeScore >= 70) return '#22c55e';
  if (gazeScore >= 40) return '#eab308';
  return '#ef4444';
}

export default function EyeMechanism({ gazeDirection, gazeScore = 0, blinkRate = 0, isActive }) {
  const iris = useMemo(() => getIrisOffset(gazeDirection), [gazeDirection]);
  const statusColor = getStatusColor(gazeScore);

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
        Eye Tracking
      </h2>

      <div className="flex items-center justify-center gap-6">
        {/* Left Eye */}
        <Eye irisOffset={iris} isActive={isActive} statusColor={statusColor} />
        {/* Right Eye */}
        <Eye irisOffset={iris} isActive={isActive} statusColor={statusColor} />
      </div>

      {/* Gaze info bar */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-white/40 flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}60` }}
          />
          {gazeDirection || 'Unknown'}
        </span>
        <span className="text-white/30 tabular-nums">
          {blinkRate} blinks/min
        </span>
      </div>
    </div>
  );
}

function Eye({ irisOffset, isActive, statusColor }) {
  return (
    <svg width="80" height="56" viewBox="0 0 80 56" className="drop-shadow-lg">
      {/* Glow behind the eye */}
      <defs>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={statusColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="irisGrad" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </radialGradient>
        <radialGradient id="pupilGrad" cx="40%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f0a1e" />
        </radialGradient>
        <filter id="irisGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="40" cy="28" rx="36" ry="26" fill="url(#eyeGlow)" />

      {/* Eye white (sclera) */}
      <ellipse
        cx="40" cy="28" rx="32" ry="20"
        fill="#0f172a"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
      />
      {/* Inner sclera gradient */}
      <ellipse
        cx="40" cy="28" rx="30" ry="18"
        fill="#111827"
      />

      {/* Iris */}
      <g style={{
        transform: `translate(${irisOffset.x}px, ${irisOffset.y}px)`,
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <circle
          cx="40" cy="28" r="12"
          fill="url(#irisGrad)"
          filter={isActive ? 'url(#irisGlow)' : undefined}
          opacity={isActive ? 1 : 0.5}
        />
        {/* Iris pattern rings */}
        <circle cx="40" cy="28" r="10" fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5" />
        <circle cx="40" cy="28" r="7" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="0.5" />

        {/* Pupil */}
        <circle
          cx="40" cy="28" r="5"
          fill="url(#pupilGrad)"
        />

        {/* Light reflection */}
        <circle cx="36" cy="24" r="2" fill="white" opacity="0.6" />
        <circle cx="43" cy="26" r="1" fill="white" opacity="0.3" />
      </g>

      {/* Upper eyelid shadow */}
      <ellipse
        cx="40" cy="18" rx="30" ry="10"
        fill="rgba(7,11,22,0.6)"
        clipPath="url(#eyelidClip)"
      />
    </svg>
  );
}
