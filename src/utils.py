"""
Shared utilities for the Attention Monitoring System.
"""

import math
import cv2
import numpy as np
from datetime import datetime


def euclidean_distance(point1, point2):
    """Calculate Euclidean distance between two 2D/3D points."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(point1, point2)))


def landmarks_to_np(landmarks, indices, frame_w, frame_h):
    """Convert MediaPipe landmark indices to numpy array of (x, y) pixel coords."""
    points = []
    for idx in indices:
        lm = landmarks[idx]
        points.append([int(lm.x * frame_w), int(lm.y * frame_h)])
    return np.array(points, dtype=np.float64)


def landmarks_to_3d(landmarks, indices, frame_w, frame_h):
    """Convert MediaPipe landmark indices to numpy array of (x, y, z) pixel coords."""
    points = []
    for idx in indices:
        lm = landmarks[idx]
        points.append([lm.x * frame_w, lm.y * frame_h, lm.z * frame_w])
    return np.array(points, dtype=np.float64)


def draw_score_overlay(frame, score, status, blink_rate=None, gaze_dir=None, head_dir=None):
    """Draw attention score and status overlay on frame."""
    h, w = frame.shape[:2]
    
    # Semi-transparent background panel
    overlay = frame.copy()
    panel_h = 160 if blink_rate is not None else 100
    cv2.rectangle(overlay, (10, 10), (320, 10 + panel_h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
    
    # Score color: green (high) → yellow (mid) → red (low)
    if score >= 70:
        color = (0, 220, 100)
    elif score >= 40:
        color = (0, 200, 255)
    else:
        color = (0, 80, 255)
    
    # Attention score
    cv2.putText(frame, f"Attention: {int(score)}%", (20, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    
    # Status
    cv2.putText(frame, f"Status: {status}", (20, 75),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    
    y_offset = 100
    if gaze_dir:
        cv2.putText(frame, f"Gaze: {gaze_dir}", (20, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        y_offset += 25
    
    if head_dir:
        cv2.putText(frame, f"Head: {head_dir}", (20, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        y_offset += 25
    
    if blink_rate is not None:
        cv2.putText(frame, f"Blinks/min: {blink_rate:.1f}", (20, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    
    return frame


def get_timestamp():
    """Return current ISO timestamp."""
    return datetime.now().isoformat()
