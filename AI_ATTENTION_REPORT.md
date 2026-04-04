# AI Attention — Complete Technical Analysis

---

## 1. Project Overview

The **AI Attention** project is a real-time computer vision system designed to monitor and quantify user attention using webcam or video input. It integrates facial landmark detection, gaze tracking, head pose estimation, and blink analysis to compute a unified **Attention Score (0–100)**. The system is built for applications such as online learning, remote proctoring, driver alertness, and productivity monitoring.

Key features include:
- **Real-time feedback** via annotated video and a web dashboard (Flask and React frontends)
- **Session persistence** using SQLite, with full score timelines
- **REST API** for programmatic access to attention data
- Support for both live webcam and uploaded video files

---

## 2. Dataset Information

> [!IMPORTANT]
> This is an **inference-only, rule-based system**. No pre-compiled training dataset is used.

| Aspect | Details |
|---|---|
| **Input Source** | Live webcam or uploaded video files (`.mp4`, `.avi`, etc.) |
| **Data Type** | Raw video frames (BGR images via OpenCV) |
| **Preprocessing** | BGR → RGB conversion, optional mirroring for webcam |
| **Face Detection** | MediaPipe Face Mesh (478 landmarks) |
| **Normalization** | Landmarks normalized and scaled to pixel coordinates |

---

## 3. Model Architecture

> [!NOTE]
> No deep learning model is trained; MediaPipe Face Mesh is used for landmark detection, with geometric and algorithmic methods for feature extraction.

- **Face Detection**: MediaPipe Face Mesh (478 landmarks)
- **Gaze Tracking**: Iris position ratios within eye bounding box, smoothed over 5 frames
- **Head Pose**: OpenCV `solvePnP` with 6 key facial landmarks, smoothed over 7 frames
- **Blink Detection**: Eye Aspect Ratio (EAR) algorithm, 5-frame smoothing
- **Attention Score**: Weighted sum (Gaze 40%, Head Pose 30%, Blink 30%), with EMA smoothing

---

## 4. Training Configuration

> [!IMPORTANT]
> No model training is performed. All thresholds and weights are set empirically.

| Parameter | Value |
|---|---|
| EMA Smoothing Alpha | 0.3 |
| Gaze Weight | 0.40 |
| Head Pose Weight | 0.30 |
| Blink Weight | 0.30 |
| EAR Threshold | 0.21 |
| Drowsy Duration | 2.0 seconds |

---

## 5. Feature Extraction Details

- **Gaze**: Horizontal/vertical iris ratios, direction classification, 5-frame smoothing
- **Head Pose**: Yaw, pitch, roll, direction classification, 7-frame smoothing
- **Blink**: EAR, blink rate, drowsiness detection, 5-frame smoothing

---

## 6. Evaluation Metrics

> [!NOTE]
> As a rule-based system, traditional ML metrics are not used.

| Metric | Description |
|---|---|
| **Attention Score** | 0–100, EMA-smoothed |
| **Component Scores** | Gaze, Head Pose, Blink |
| **Status** | Focused / Distracted / Drowsy |
| **Blink Rate** | Blinks per minute |
| **Session Average** | Average score per session |

---

## 7. Results and Performance

- **Real-time processing**: ~30fps on webcam input
- **Latency**: 15–30ms per frame (MediaPipe + computation)
- **Score Behavior**: Responsive to attention changes, robust drowsiness detection, graceful handling of no-face scenarios

---

## 8. Code Structure

```
AI Attention/
├── app.py                # Flask server, video streaming, API
├── requirements.txt      # Python dependencies
├── src/                  # Core modules: face_detection, gaze_tracking, head_pose, blink_detection, attention_score, utils
├── templates/            # Flask UI
├── static/               # CSS/JS assets
├── frontend/             # React dashboard (Vite + Tailwind)
└── uploads/              # Uploaded videos
```

---

## 9. Libraries and Dependencies

- **Backend**: Python 3.x, Flask, OpenCV, MediaPipe, NumPy, SQLite3, threading
- **Frontend**: HTML/CSS/JS (Flask), React, Vite, Tailwind CSS

---

## 10. Instructions for Execution

1. Clone the repo and navigate to the directory
2. Create and activate a Python virtual environment
3. Install dependencies: `pip install -r requirements.txt`
4. Run the backend: `python app.py`
5. Access via browser (Flask UI or React dashboard)
6. Use API endpoints for programmatic access

---

## 11. Challenges Faced and Solutions

- **Real-time performance**: Limited face detection to 1 face, optimized array handling
- **Score jitter**: Applied EMA and moving averages
- **Drowsiness detection**: Required 2 seconds of continuous eye closure
- **Thread safety**: Used locks and per-request DB connections
- **No-face handling**: Graceful score decay and initialization logic

---

## 12. Potential Improvements

- Train a supervised model for attention scoring
- Add emotion recognition and audio analysis
- Support multi-face and multi-modal input
- Use WebSockets for real-time dashboard updates
- Enhance robustness to lighting, occlusion, and adversarial scenarios

---

## Summary

**AI Attention** is a robust, real-time system for attention monitoring, combining classical computer vision, signal processing, and modern web technologies. It is production-ready, extensible, and suitable for a wide range of attention-sensitive applications.

---
