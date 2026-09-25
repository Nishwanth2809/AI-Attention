---
title: AI Attention Monitoring System
emoji: 👁️
colorFrom: purple
colorTo: blue
sdk: gradio
sdk_version: 4.44.1
app_file: app.py
pinned: false
---

# AI Attention Monitoring System

Real-time attention monitoring using computer vision. Tracks eye gaze, head pose, and blink rate to produce an **Attention Score (0–100)**.

## Features

- **Real-time webcam** monitoring with live attention score
- **Video file upload** for offline analysis
- **Deep learning backbone** — MediaPipe Face Mesh (478 landmarks)
- **Attention metrics:**
  - Eye gaze direction (iris tracking)
  - Head pose estimation (yaw/pitch/roll via solvePnP)
  - Blink rate & drowsiness detection (EAR algorithm)
- **Weighted scoring:** Gaze 40% + Head Pose 30% + Blink 30%
- **Session storage** in SQLite with full score timeline
- **REST API** for score data and session history

## Tech Stack

- Python 3.x, OpenCV, MediaPipe, NumPy, Flask, SQLite

## Installation

```bash
# Clone / navigate to project
cd lie_detection

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

```bash
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

- Click **Start Webcam** to begin real-time monitoring
- Click **Upload Video** to analyze a recorded video
- View attention score, component breakdown, and session history in the dashboard

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Main UI |
| `/video_feed` | GET | MJPEG webcam stream |
| `/upload_video` | POST | Upload video file |
| `/video_feed/<filename>` | GET | Stream uploaded video |
| `/stop_feed` | POST | Stop current feed |
| `/api/score` | GET | Current score JSON |
| `/api/sessions` | GET | Session history |
| `/api/sessions/<id>` | GET | Session detail + timeline |
| `/api/timeline` | GET | Live score timeline |

## Project Structure

```
├── app.py                  # Flask server
├── requirements.txt
├── README.md
├── src/
│   ├── face_detection.py   # MediaPipe Face Mesh
│   ├── blink_detection.py  # EAR blink detection
│   ├── head_pose.py        # 3D head pose (solvePnP)
│   ├── gaze_tracking.py    # Iris-based gaze tracking
│   ├── attention_score.py  # Weighted attention scoring
│   └── utils.py            # Shared utilities
├── templates/
│   └── index.html
├── static/
│   ├── css/style.css
│   └── js/main.js
└── uploads/                # Uploaded videos (auto-created)
```

## Attention Score

| Status | Score Range |
|---|---|
| Focused | 65–100 |
| Distracted | 35–64 |
| Drowsy | Eyes closed > 2 seconds |
