"""
AI Attention Monitoring System — Flask Application.
Provides webcam streaming, video file upload, and attention score API.
"""

import os
import time
import json
import sqlite3
import threading
from datetime import datetime
from flask import Flask, Response, render_template, request, jsonify, send_from_directory

import cv2
import numpy as np

from src.face_detection import FaceDetector
from src.blink_detection import BlinkDetector
from src.head_pose import HeadPoseEstimator
from src.gaze_tracking import GazeTracker
from src.attention_score import AttentionScorer
from src.utils import draw_score_overlay

# ---------------------------------------------------------------------------
# Flask App Setup
# ---------------------------------------------------------------------------

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIST, 'assets') if os.path.exists(FRONTEND_DIST) else 'static')

app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB max
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

DB_PATH = os.path.join(os.path.dirname(__file__), 'attention.db')

# ---------------------------------------------------------------------------
# Global State (thread-safe via locks)
# ---------------------------------------------------------------------------

class AppState:
    """Thread-safe global state for the attention monitoring pipeline."""

    def __init__(self):
        self.lock = threading.Lock()
        self.face_detector = FaceDetector()
        self.blink_detector = BlinkDetector()
        self.head_pose_estimator = HeadPoseEstimator()
        self.gaze_tracker = GazeTracker()
        self.attention_scorer = AttentionScorer()

        # Current results
        self.current_score = 50.0
        self.current_status = "Initializing"
        self.current_components = {'gaze': 0, 'head_pose': 0, 'blink': 0}
        self.current_blink_rate = 0.0
        self.current_gaze_dir = "Unknown"
        self.current_head_dir = "Unknown"
        self.no_face_count = 0

        # Session tracking
        self.session_id = None
        self.session_active = False

        # Video source
        self.video_source = 'webcam'  # 'webcam' or filename
        self.video_cap = None

    def reset_detectors(self):
        """Reset all detector states for a new session."""
        self.blink_detector.reset()
        self.head_pose_estimator.reset()
        self.gaze_tracker.reset()
        self.attention_scorer.reset()
        self.current_score = 50.0
        self.current_status = "Initializing"
        self.no_face_count = 0


state = AppState()

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def init_db():
    """Initialize SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            avg_score REAL DEFAULT 0,
            status TEXT DEFAULT 'active'
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS score_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            timestamp REAL NOT NULL,
            score REAL NOT NULL,
            status TEXT,
            gaze_score REAL,
            head_score REAL,
            blink_score REAL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    ''')
    conn.commit()
    conn.close()


def start_session(source='webcam'):
    """Create a new session in DB."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        'INSERT INTO sessions (source, start_time) VALUES (?, ?)',
        (source, datetime.now().isoformat())
    )
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id


def log_score(session_id, score, status, gaze, head, blink):
    """Log a score data point."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        'INSERT INTO score_log (session_id, timestamp, score, status, gaze_score, head_score, blink_score) '
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
        (session_id, time.time(), score, status, gaze, head, blink)
    )
    conn.commit()
    conn.close()


def end_session(session_id, avg_score):
    """Mark session as complete."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        'UPDATE sessions SET end_time=?, avg_score=?, status=? WHERE id=?',
        (datetime.now().isoformat(), avg_score, 'complete', session_id)
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Frame Processing Pipeline
# ---------------------------------------------------------------------------

def process_frame(frame):
    """
    Run the full attention detection pipeline on a single frame.
    Updates global state with results. Returns annotated frame.
    """
    h, w = frame.shape[:2]
    
    # Detect face
    faces = state.face_detector.detect(frame)
    
    if not faces:
        state.no_face_count += 1
        if state.no_face_count > 15:  # ~0.5s at 30fps
            state.current_status = "No Face Detected"
            state.current_score = max(0, state.current_score - 1)
        
        # Draw overlay even with no face
        frame = draw_score_overlay(
            frame, state.current_score, state.current_status
        )
        return frame
    
    state.no_face_count = 0
    landmarks = faces[0]  # use first face

    # Blink detection
    blink_result = state.blink_detector.update(landmarks, w, h)

    # Head pose
    head_result = state.head_pose_estimator.estimate(landmarks, w, h)

    # Gaze tracking
    gaze_result = state.gaze_tracker.track(landmarks, w, h)

    # Calculate attention score
    score_result = state.attention_scorer.calculate(
        gaze_score=gaze_result['gaze_score'],
        head_score=head_result['head_score'],
        blink_score=blink_result['blink_score'],
        is_drowsy=blink_result['is_drowsy'],
    )

    # Update state
    with state.lock:
        state.current_score = score_result['smoothed_score']
        state.current_status = score_result['status']
        state.current_components = score_result['components']
        state.current_blink_rate = blink_result['blinks_per_minute']
        state.current_gaze_dir = gaze_result['direction']
        state.current_head_dir = head_result['direction']

    # Log to DB periodically (every ~1 second = every 30 frames)
    if state.session_id and hasattr(process_frame, '_frame_count'):
        process_frame._frame_count += 1
        if process_frame._frame_count % 30 == 0:
            try:
                log_score(
                    state.session_id,
                    score_result['smoothed_score'],
                    score_result['status'],
                    gaze_result['gaze_score'],
                    head_result['head_score'],
                    blink_result['blink_score'],
                )
            except Exception:
                pass
    else:
        process_frame._frame_count = 0

    # Draw overlay
    frame = draw_score_overlay(
        frame,
        state.current_score,
        state.current_status,
        blink_rate=state.current_blink_rate,
        gaze_dir=state.current_gaze_dir,
        head_dir=state.current_head_dir,
    )

    return frame


# ---------------------------------------------------------------------------
# Video Generators
# ---------------------------------------------------------------------------

def gen_webcam():
    """Generate MJPEG frames from webcam."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return

    state.reset_detectors()
    state.session_id = start_session('webcam')
    state.session_active = True

    try:
        while state.session_active:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)  # mirror
            frame = process_frame(frame)

            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n'
            )
    finally:
        cap.release()
        if state.session_id:
            avg = state.attention_scorer.get_average_score()
            end_session(state.session_id, avg)
            state.session_id = None


def gen_video_file(filepath):
    """Generate MJPEG frames from a video file."""
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        return

    state.reset_detectors()
    filename = os.path.basename(filepath)
    state.session_id = start_session(f'file:{filename}')
    state.session_active = True

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    delay = 1.0 / fps

    try:
        while state.session_active:
            ret, frame = cap.read()
            if not ret:
                break

            frame = process_frame(frame)

            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n'
            )
            time.sleep(delay)
    finally:
        cap.release()
        if state.session_id:
            avg = state.attention_scorer.get_average_score()
            end_session(state.session_id, avg)
            state.session_id = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    """Serve the main UI."""
    if os.path.exists(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return render_template('index.html')


@app.route('/assets/<path:path>')
def serve_assets(path):
    """Serve frontend static assets."""
    assets_dir = os.path.join(FRONTEND_DIST, 'assets')
    if os.path.exists(os.path.join(assets_dir, path)):
        return send_from_directory(assets_dir, path)
    return jsonify({'error': 'Asset not found'}), 404


@app.route('/process_frame', methods=['POST'])
def process_frame_api():
    """Accept a single video frame (image) from the frontend, process it, and return the attention score."""
    if 'frame' not in request.files:
        return jsonify({'error': 'No frame provided'}), 400
    file = request.files['frame']
    img_bytes = file.read()
    # Convert bytes to numpy array
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if frame is None:
        return jsonify({'error': 'Invalid image data'}), 400

    # Process frame as usual
    with state.lock:
        process_frame(frame)
        score = state.current_score
        status = state.current_status
        components = state.current_components
        blink_rate = state.current_blink_rate
        gaze_direction = state.current_gaze_dir
        head_direction = state.current_head_dir

    return jsonify({
        'score': score,
        'status': status,
        'components': components,
        'blink_rate': blink_rate,
        'gaze_direction': gaze_direction,
        'head_direction': head_direction,
        'success': True
    })


@app.route('/video_feed')
def video_feed():
    """MJPEG webcam stream endpoint."""
    return Response(
        gen_webcam(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/upload_video', methods=['POST'])
def upload_video():
    """Upload a video file for analysis."""
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    allowed = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        return jsonify({'error': f'Unsupported format. Allowed: {", ".join(allowed)}'}), 400

    filename = f"{int(time.time())}_{file.filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    return jsonify({
        'success': True,
        'filename': filename,
        'stream_url': f'/video_feed/{filename}',
    })


@app.route('/video_feed/<filename>')
def video_feed_file(filename):
    """MJPEG stream of an uploaded video file."""
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    return Response(
        gen_video_file(filepath),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/stop_feed', methods=['POST'])
def stop_feed():
    """Stop the current video feed."""
    state.session_active = False
    return jsonify({'success': True})


@app.route('/api/score')
def api_score():
    """Get current attention score and component details."""
    with state.lock:
        return jsonify({
            'score': state.current_score,
            'status': state.current_status,
            'components': state.current_components,
            'blink_rate': round(state.current_blink_rate, 1),
            'gaze_direction': state.current_gaze_dir,
            'head_direction': state.current_head_dir,
        })


@app.route('/api/sessions')
def api_sessions():
    """Get session history."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM sessions ORDER BY id DESC LIMIT 50')
    sessions = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(sessions)


@app.route('/api/sessions/<int:session_id>')
def api_session_detail(session_id):
    """Get session detail with score timeline."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('SELECT * FROM sessions WHERE id=?', (session_id,))
    session = c.fetchone()
    if not session:
        conn.close()
        return jsonify({'error': 'Session not found'}), 404

    c.execute(
        'SELECT timestamp, score, status, gaze_score, head_score, blink_score '
        'FROM score_log WHERE session_id=? ORDER BY timestamp',
        (session_id,)
    )
    scores = [dict(row) for row in c.fetchall()]
    conn.close()

    return jsonify({
        'session': dict(session),
        'scores': scores,
    })


@app.route('/api/timeline')
def api_timeline():
    """Get current session score timeline (for live graph)."""
    timeline = state.attention_scorer.get_score_timeline()
    return jsonify(timeline)


# ---------------------------------------------------------------------------
# Hugging Face Spaces Gradio SDK Mount & Main Entrypoint
# ---------------------------------------------------------------------------

# Ensure database tables exist
init_db()

try:
    import gradio as gr
    # Mount Flask directly inside Gradio so HF Spaces Gradio SDK hosts the full Flask + React dashboard
    demo = gr.mount_gradio_app(app, gr.Blocks(title="AI Attention Monitor"), path="/gradio")
except Exception as e:
    demo = None

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 7860))
    print("=" * 60)
    print("  AI Attention Monitoring System")
    print(f"  Listening on http://0.0.0.0:{port}")
    print("=" * 60)
    app.run(debug=False, host='0.0.0.0', port=port, threaded=True)
