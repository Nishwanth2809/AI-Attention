import { useState } from 'react';
import Icon from '../../ui/Icon';
import Chart from '../../ui/Chart';
import { formatDuration } from '../../core/session';
export default function FocusSpace({ focus, navigate }) {
  const [title, setTitle] = useState('Make progress on my next big idea');
  const [minutes, setMinutes] = useState(25);
  const { live, phase, metrics, cameraState, videoRef } = focus;
  const isDemo = live?.mode === 'demo';
  const ready = phase === 'running' && (isDemo || cameraState === 'ready');
  const cameraMessage = cameraState === 'loading' ? 'Loading your private vision model…' : cameraState === 'permission' ? 'Allow camera access to begin' : 'Your camera stays on your device';
  const remaining = live ? Math.max(0, live.targetMinutes * 60000 - live.elapsed) : minutes * 60000;
  const recent = live?.events || [];
  return <>
    <section className="welcome-row"><div><div className="eyebrow">YOUR SPACE TO DO GOOD WORK</div><h1>A little focus.<br className="mobile-break"/> A lot of possibility.</h1><p>Set an intention. Find your rhythm. Let your coach handle the rest.</p></div><span className="privacy-pill"><Icon name="shield" size={15}/> Private by design</span></section>
    <div className="workspace-grid">
      <div className="workspace-main">
        <section className="session-card">
          <div className="session-top"><span className="tiny-label"><span className={`status-dot ${ready ? 'pulse' : ''}`}/>{live ? isDemo ? 'INTERACTIVE DEMO' : 'PERSONAL FOCUS SESSION' : 'A SMALL COMMITMENT TO YOURSELF'}</span><Icon name="leaf" size={23}/></div>
          {!live ? <><label className="intention-label" htmlFor="intention">What deserves your attention?</label><input id="intention" className="intention-input" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} aria-label="Session intention"/><div className="session-setup"><div className="duration-select" aria-label="Session length">{[15, 25, 50].map(n => <button key={n} className={minutes === n ? 'selected' : ''} onClick={() => setMinutes(n)}>{n} min</button>)}</div><button className="button button-lime" onClick={() => focus.start('camera', title, minutes)}><Icon name="play" size={16}/> Start focusing</button></div><div className="session-foot"><span><Icon name="shield" size={13}/> Camera never leaves your device</span><button className="text-button light" onClick={() => focus.start('demo', 'Explore your focus coach', minutes)}>Try a demo first <Icon name="arrow" size={15}/></button></div></>
          : <><div className="active-heading"><div><h2>{live.title}</h2><span>{phase === 'paused' ? 'Take your time. We’ll be here.' : isDemo ? 'Simulated signals · real automation engine' : cameraState !== 'ready' ? cameraMessage : 'One task. One moment at a time.'}</span></div><div className="timer">{formatDuration(remaining, true)}<small>remaining</small></div></div><div className="session-progress"><span style={{ width: `${Math.min(100, live.elapsed / (live.targetMinutes * 60000) * 100)}%` }}/></div><div className="session-setup"><span className="active-time"><Icon name="clock" size={16}/>{formatDuration(live.elapsed)} of intentional time</span><div className="button-row"><button className="button button-ghost-light" onClick={phase === 'paused' ? focus.resume : focus.pause}><Icon name={phase === 'paused' ? 'play' : 'pause'} size={16}/>{phase === 'paused' ? 'Resume' : 'Pause'}</button><button className="button button-lime" onClick={() => { focus.finish(); navigate('reports'); }}><Icon name="check" size={16}/> Finish</button></div></div></>}
        </section>
        <section className="panel attention-panel">
          <div className="panel-heading"><div><h2>Your attention, in the moment</h2><p>A gentle signal, never a judgment.</p></div><span className={`badge ${ready ? 'green' : ''}`}><span className="dot"/>{phase === 'paused' ? 'Paused' : ready ? isDemo ? 'Simulated' : 'Live' : 'Standby'}</span></div>
          <div className="attention-content">
            <div className={`camera-preview ${live?.mode === 'camera' && ready ? 'camera-on' : ''}`}>
              <video ref={videoRef} autoPlay playsInline muted className={live?.mode === 'camera' && ready ? '' : 'visually-hidden-video'} aria-label="Private camera preview"/>
              {!(live?.mode === 'camera' && ready) && <div className="focus-visual"><div className={`orbit orbit-one ${ready ? 'orbit-moving' : ''}`}/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="visual-center"><Icon name={phase === 'paused' ? 'pause' : 'eye'} size={34}/></div><i className="orb-dot dot-one"/><i className="orb-dot dot-two"/><i className="orb-dot dot-three"/></div>}
              <span className="preview-corner tl"/><span className="preview-corner tr"/><span className="preview-corner bl"/><span className="preview-corner br"/>
              <span className="preview-caption">{phase === 'paused' ? 'A moment to reset' : isDemo ? 'Demo signals • no camera' : live ? cameraMessage : 'Your focus starts here'}</span>
            </div>
            <div className="attention-score"><div className="score-label">FOCUS SIGNAL <Icon name="info" size={13}/></div><div className="score-number">{live && live.sampleCount ? metrics.score : '—'}<span>/ 100</span></div><span className="score-status">{phase === 'paused' ? 'On a mindful pause' : live && live.sampleCount ? metrics.status : 'Ready when you are'}</span><div className="signal-bars">{[['Gaze alignment', metrics.gaze], ['Head alignment', metrics.posture], ['Eye openness', metrics.eyes]].map(([label, value]) => <div className="signal-row" key={label}><div><span>{label}</span><strong>{live && live.sampleCount ? `${value}%` : '—'}</strong></div><div className="meter"><span style={{ width: `${live && live.sampleCount ? value : 0}%` }}/></div></div>)}</div></div>
          </div>
          <div className="chart-heading"><span>SESSION RHYTHM</span><span><i/> Focus score</span></div><Chart samples={live?.samples || []} height={105}/><div className="chart-footer"><span>Start</span><span>{live ? formatDuration(live.elapsed) : 'Your timeline will grow as you focus'}</span><span>Now</span></div>
        </section>
      </div>
      <aside className="workspace-side">
        <section className="panel coach-card"><div className="coach-icon"><Icon name="leaf" size={24}/></div><span className="eyebrow">A QUIETER KIND OF PRODUCTIVITY</span><h2>You bring the intention.<br/>We’ll bring the nudges.</h2><p>Your coach notices when attention drifts, makes space for breaks, and celebrates your momentum.</p><div className="coach-divider"/><div className="coach-feature"><Icon name="check" size={16}/><span>No accounts. No subscriptions.</span></div><div className="coach-feature"><Icon name="check" size={16}/><span>Your camera and data stay local.</span></div></section>
        <section className="panel rules-summary"><div className="panel-heading"><h2>Working in the background</h2><span className="count-pill">{focus.rules.filter(r => r.enabled).length}</span></div><div className="mini-rules">{focus.rules.slice(0, 3).map(rule => <div className="mini-rule" key={rule.id}><span className={`rule-symbol ${rule.enabled ? '' : 'disabled'}`}><Icon name={rule.trigger === 'interval' ? 'clock' : rule.trigger === 'away' ? 'pause' : 'bolt'} size={16}/></span><div><strong>{rule.name}</strong><small>{rule.enabled ? 'Ready to help' : 'Turned off'}</small></div><span className={`dot ${rule.enabled ? 'green-dot' : ''}`}/></div>)}</div><button className="text-button full" onClick={() => navigate('automations')}>Make it your own <Icon name="arrow" size={16}/></button></section>
        <section className="panel activity-panel"><div className="panel-heading"><h2>Coach activity</h2><span className="badge">{recent.length} runs</span></div>{recent.length ? <div className="activity-list">{recent.slice(0, 3).map(e => <div className="activity" key={e.id}><span className="activity-dot"/><div><strong>{e.title}</strong><small>{e.delivery}</small><time>{formatDuration(e.elapsed)} into session</time></div></div>)}</div> : <div className="empty-activity"><Icon name="bolt" size={23}/><p>A little quiet is a good thing.</p><small>Your automation activity appears here.</small></div>}</section>
      </aside>
    </div>
    <div className="bottom-note"><Icon name="info" size={14}/><span>Focus is personal. These visual cues are estimates, not a measure of your ability or productivity.</span></div>
  </>;
}
