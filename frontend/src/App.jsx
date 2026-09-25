import { useState } from 'react';
import Icon from './ui/Icon';
import FocusSpace from './features/focus/FocusSpace';
import Automations from './features/automations/Automations';
import Reports from './features/reports/Reports';
import Settings from './features/reports/Settings';
import { useFocus } from './features/focus/useFocus';
export default function App() {
  const [page, setPage] = useState('focus');
  const focus = useFocus();
  const nav = [['focus', 'grid', 'Focus space'], ['automations', 'bolt', 'Automations'], ['reports', 'chart', 'Reports']];
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('focus'); }} aria-label="Attn home"><span className="brand-mark"><span/><span/><span/></span><strong>attn<span>.</span></strong></a><div className="sidebar-caption">MAKE SPACE FOR WHAT MATTERS</div><div className="nav-label">WORKSPACE</div><nav aria-label="Main navigation">{nav.map(([id, icon, name]) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon name={icon} size={19}/><span>{name}</span>{id === 'automations' && <small>{focus.rules.filter(r => r.enabled).length}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="little-spark">✳</span><h3>Less noise.<br/>More meaningful work.</h3><p>A personal coach for your attention, one session at a time.</p><button onClick={() => { setPage('focus'); if (!focus.live) focus.start('demo', 'Explore your focus coach', 25); }}>Explore the demo <Icon name="arrow" size={14}/></button></div><button className={`nav-item ${page === 'settings' ? 'active' : ''}`} aria-label="Settings and privacy" onClick={() => setPage('settings')}><Icon name="settings" size={19}/><span>Settings & privacy</span></button><div className="local-profile"><span className="profile-icon"><Icon name="leaf" size={19}/></span><div><strong>Your personal space</strong><small><i/> Saved on this device</small></div></div></div>
    </aside>
    <div className="app-body"><header className="topbar"><div><span className="breadcrumb">Workspace</span><span className="slash">/</span><strong>{nav.find(n => n[0] === page)?.[2] || 'Settings & privacy'}</strong></div><div className="topbar-right"><span className="today">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>{focus.live ? <button className="header-session" onClick={() => setPage('focus')}><span className={`dot ${focus.phase === 'running' ? 'green-dot' : ''}`}/>{focus.phase === 'running' ? 'Session active' : 'Session paused'}</button> : <span className="header-session"><Icon name="leaf" size={14}/> A fresh start</span>}<button className="icon-button help-button" aria-label="Privacy information" onClick={() => setPage('settings')}><Icon name="info" size={19}/></button></div></header>
      <main id="main" className="main-content"><div hidden={page !== 'focus'}><FocusSpace focus={focus} navigate={setPage}/></div>{page === 'automations' && <Automations focus={focus}/>} {page === 'reports' && <Reports focus={focus} navigate={setPage}/>} {page === 'settings' && <Settings focus={focus}/>}
      <footer className="app-footer"><span>Designed for intention, not perfection.</span><span>attn. <i/> YOUR PERSONAL FOCUS COACH</span></footer></main>
    </div>
    {focus.notice && <div className={`toast ${focus.notice.error ? 'error' : ''}`} role="status"><span className="toast-icon"><Icon name={focus.notice.error ? 'info' : 'leaf'} size={22}/></span><div><strong>{focus.notice.title}</strong><p>{focus.notice.message}</p></div><button className="icon-button" onClick={() => focus.setNotice(null)} aria-label="Dismiss coach message"><Icon name="close" size={17}/></button></div>}
  </div>;
}
