/* ============================
   AI Attention Monitor — Client JS
   ============================ */

let scoreInterval = null;
let sessionInterval = null;
let isStreaming = false;

// ---- Video Controls ----

function startWebcam() {
    const feed = document.getElementById('video-feed');
    const placeholder = document.getElementById('video-placeholder');

    feed.src = '/video_feed?' + Date.now();
    feed.style.display = 'block';
    placeholder.style.display = 'none';
    
    isStreaming = true;
    document.getElementById('btn-webcam').disabled = true;
    document.getElementById('btn-stop').disabled = false;

    startPolling();
}

function uploadVideo(input) {
    if (!input.files || !input.files[0]) return;

    const formData = new FormData();
    formData.append('video', input.files[0]);

    const feed = document.getElementById('video-feed');
    const placeholder = document.getElementById('video-placeholder');

    placeholder.innerHTML = '<div class="placeholder-icon">⏳</div><p>Uploading...</p>';

    fetch('/upload_video', {
        method: 'POST',
        body: formData,
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            feed.src = data.stream_url + '?' + Date.now();
            feed.style.display = 'block';
            placeholder.style.display = 'none';
            
            isStreaming = true;
            document.getElementById('btn-webcam').disabled = true;
            document.getElementById('btn-stop').disabled = false;
            startPolling();
        } else {
            placeholder.innerHTML = `<div class="placeholder-icon">❌</div><p>${data.error}</p>`;
        }
    })
    .catch(err => {
        placeholder.innerHTML = '<div class="placeholder-icon">❌</div><p>Upload failed</p>';
    });

    input.value = '';
}

function stopFeed() {
    fetch('/stop_feed', { method: 'POST' });

    const feed = document.getElementById('video-feed');
    const placeholder = document.getElementById('video-placeholder');

    feed.src = '';
    feed.style.display = 'none';
    placeholder.style.display = 'block';
    placeholder.innerHTML = '<div class="placeholder-icon">🎥</div><p>Start webcam or upload a video to begin monitoring</p>';

    isStreaming = false;
    document.getElementById('btn-webcam').disabled = false;
    document.getElementById('btn-stop').disabled = true;

    stopPolling();
    loadSessions();
}

// ---- Score Polling ----

function startPolling() {
    if (scoreInterval) clearInterval(scoreInterval);
    scoreInterval = setInterval(fetchScore, 500);
    
    if (sessionInterval) clearInterval(sessionInterval);
    sessionInterval = setInterval(loadSessions, 10000);
}

function stopPolling() {
    if (scoreInterval) { clearInterval(scoreInterval); scoreInterval = null; }
    if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
}

function fetchScore() {
    fetch('/api/score')
        .then(res => res.json())
        .then(data => updateUI(data))
        .catch(() => {});
}

// ---- UI Updates ----

function updateUI(data) {
    const score = Math.round(data.score);
    
    // Score circle
    const ring = document.getElementById('score-ring');
    const circumference = 2 * Math.PI * 52;
    const offset = circumference * (1 - score / 100);
    ring.style.strokeDashoffset = offset;

    // Score color
    let color;
    if (score >= 65) color = '#22c55e';
    else if (score >= 35) color = '#f59e0b';
    else color = '#ef4444';
    ring.style.stroke = color;

    // Score value
    document.getElementById('score-value').textContent = score;
    document.getElementById('score-value').style.color = color;

    // Status badge
    const badge = document.getElementById('status-badge');
    badge.textContent = data.status;
    badge.className = 'status-badge ' + data.status.toLowerCase();

    // Component bars
    updateBar('gaze', data.components.gaze);
    updateBar('head', data.components.head_pose);
    updateBar('blink', data.components.blink);

    // Details
    document.getElementById('gaze-dir').textContent = data.gaze_direction;
    document.getElementById('head-dir').textContent = data.head_direction;
    document.getElementById('blink-rate').textContent = data.blink_rate;
}

function updateBar(name, value) {
    const bar = document.getElementById(name + '-bar');
    const val = document.getElementById(name + '-value');
    
    bar.style.width = value + '%';
    val.textContent = Math.round(value);

    if (value >= 65) bar.style.background = '#22c55e';
    else if (value >= 35) bar.style.background = '#f59e0b';
    else bar.style.background = '#ef4444';
}

// ---- Sessions ----

function loadSessions() {
    fetch('/api/sessions')
        .then(res => res.json())
        .then(sessions => {
            const list = document.getElementById('session-list');
            if (!sessions.length) {
                list.innerHTML = '<p class="muted">No sessions yet</p>';
                return;
            }
            list.innerHTML = sessions.slice(0, 5).map(s => {
                const date = new Date(s.start_time).toLocaleString();
                const score = s.avg_score ? Math.round(s.avg_score) : '--';
                return `<div class="session-item">
                    <span>${s.source} — ${date}</span>
                    <span>${score}%</span>
                </div>`;
            }).join('');
        })
        .catch(() => {});
}

// Initial load
document.addEventListener('DOMContentLoaded', loadSessions);
