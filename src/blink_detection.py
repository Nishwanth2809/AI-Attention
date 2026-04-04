"""
Blink Detection module using Eye Aspect Ratio (EAR).
Tracks blink frequency and detects drowsiness (prolonged eye closure).
"""

import time
from .utils import euclidean_distance

# MediaPipe Face Mesh landmark indices for each eye
# Right eye (from viewer perspective)
RIGHT_EYE_UPPER = [159, 145]  # vertical pair 1
RIGHT_EYE_LOWER = [158, 153]  # vertical pair 2 (approximate)
RIGHT_EYE_LEFT = 33    # leftmost corner
RIGHT_EYE_RIGHT = 133  # rightmost corner
RIGHT_EYE_VERTICAL = [(159, 145), (158, 153)]  # (top, bottom) pairs

# Left eye
LEFT_EYE_LEFT = 362    # leftmost corner
LEFT_EYE_RIGHT = 263   # rightmost corner
LEFT_EYE_VERTICAL = [(386, 374), (385, 380)]   # (top, bottom) pairs

# Full eye contour indices for reference
RIGHT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
LEFT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]


class BlinkDetector:
    """Detects blinks and measures blink rate using Eye Aspect Ratio (EAR)."""

    # Thresholds
    EAR_THRESHOLD = 0.21        # Below this = eye closed
    DROWSY_DURATION = 2.0       # Seconds of continuous closure = drowsy
    NORMAL_BLINK_RANGE = (12, 20)  # Normal blinks per minute range

    def __init__(self):
        self.blink_count = 0
        self.total_blinks = 0
        self.eye_closed = False
        self.eye_close_start = None
        self.is_drowsy = False
        self.start_time = time.time()
        self.recent_blinks = []  # timestamps of recent blinks
        self._ear_history = []   # for smoothing
        self._history_size = 5

    def _compute_ear(self, landmarks, frame_w, frame_h, eye_corners, eye_verticals):
        """
        Compute Eye Aspect Ratio for one eye.
        
        EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
        where p1,p4 are horizontal corners, p2-p6, p3-p5 are vertical pairs.
        """
        left_corner = landmarks[eye_corners[0]]
        right_corner = landmarks[eye_corners[1]]
        p1 = (left_corner.x * frame_w, left_corner.y * frame_h)
        p4 = (right_corner.x * frame_w, right_corner.y * frame_h)
        
        horizontal = euclidean_distance(p1, p4)
        if horizontal == 0:
            return 0.3  # default open value
        
        vertical_sum = 0
        for top_idx, bottom_idx in eye_verticals:
            top = landmarks[top_idx]
            bottom = landmarks[bottom_idx]
            pt = (top.x * frame_w, top.y * frame_h)
            pb = (bottom.x * frame_w, bottom.y * frame_h)
            vertical_sum += euclidean_distance(pt, pb)
        
        ear = vertical_sum / (2.0 * horizontal)
        return ear

    def compute_ear_both(self, landmarks, frame_w, frame_h):
        """Compute average EAR across both eyes."""
        left_ear = self._compute_ear(
            landmarks, frame_w, frame_h,
            (LEFT_EYE_LEFT, LEFT_EYE_RIGHT), LEFT_EYE_VERTICAL
        )
        right_ear = self._compute_ear(
            landmarks, frame_w, frame_h,
            (RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT), RIGHT_EYE_VERTICAL
        )
        avg_ear = (left_ear + right_ear) / 2.0
        
        # Smooth with history
        self._ear_history.append(avg_ear)
        if len(self._ear_history) > self._history_size:
            self._ear_history.pop(0)
        
        return sum(self._ear_history) / len(self._ear_history)

    def update(self, landmarks, frame_w, frame_h):
        """
        Process one frame. Returns dict with blink info.
        
        Returns:
            dict: {
                'ear': float,
                'blink_detected': bool,
                'is_drowsy': bool,
                'blinks_per_minute': float,
                'blink_score': float (0-1, 1 = normal blink rate)
            }
        """
        current_time = time.time()
        ear = self.compute_ear_both(landmarks, frame_w, frame_h)
        
        blink_detected = False
        
        if ear < self.EAR_THRESHOLD:
            if not self.eye_closed:
                self.eye_closed = True
                self.eye_close_start = current_time
            else:
                # Check for drowsiness
                closed_duration = current_time - self.eye_close_start
                if closed_duration >= self.DROWSY_DURATION:
                    self.is_drowsy = True
        else:
            if self.eye_closed:
                # Eye just opened — count as blink
                self.eye_closed = False
                self.is_drowsy = False
                blink_detected = True
                self.total_blinks += 1
                self.recent_blinks.append(current_time)
            else:
                self.is_drowsy = False
        
        # Calculate blinks per minute (using sliding window of recent blinks)
        window = 60  # seconds
        self.recent_blinks = [t for t in self.recent_blinks if current_time - t <= window]
        elapsed = current_time - self.start_time
        
        if elapsed > 5:  # need at least 5 seconds for meaningful rate
            blinks_per_minute = len(self.recent_blinks) * (60.0 / min(elapsed, window))
        else:
            blinks_per_minute = 15.0  # assume normal until enough data
        
        # Blink score: 1.0 = normal rate, lower if too few or too many
        blink_score = self._compute_blink_score(blinks_per_minute)
        
        return {
            'ear': ear,
            'blink_detected': blink_detected,
            'is_drowsy': self.is_drowsy,
            'blinks_per_minute': blinks_per_minute,
            'blink_score': blink_score,
        }

    def _compute_blink_score(self, bpm):
        """
        Score blink rate on 0-1 scale.
        Normal: 12-20 blinks/min → 1.0
        Too few (<6): possible staring/zoned out
        Too many (>30): possible fatigue/stress
        """
        low, high = self.NORMAL_BLINK_RANGE
        
        if low <= bpm <= high:
            return 1.0
        elif bpm < low:
            return max(0.0, bpm / low)
        else:
            return max(0.0, 1.0 - (bpm - high) / 30.0)

    def reset(self):
        """Reset state for a new session."""
        self.blink_count = 0
        self.total_blinks = 0
        self.eye_closed = False
        self.eye_close_start = None
        self.is_drowsy = False
        self.start_time = time.time()
        self.recent_blinks = []
        self._ear_history = []
