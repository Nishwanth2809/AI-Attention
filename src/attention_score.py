"""
Attention Score Calculation module.
Combines gaze, head pose, and blink stability into a single score (0-100).
"""

import time

# Weights for attention components
GAZE_WEIGHT = 0.40
HEAD_POSE_WEIGHT = 0.30
BLINK_WEIGHT = 0.30

# Status thresholds
FOCUSED_THRESHOLD = 65
DISTRACTED_THRESHOLD = 35


class AttentionScorer:
    """Calculates and smooths attention score from component signals."""

    def __init__(self, ema_alpha=0.3):
        """
        Args:
            ema_alpha: Exponential moving average smoothing factor (0-1).
                       Lower = smoother/slower, higher = more responsive.
        """
        self.ema_alpha = ema_alpha
        self._smoothed_score = 50.0  # start at neutral
        self._score_history = []
        self._max_history = 300  # ~10 seconds at 30fps
        self.start_time = time.time()

    def calculate(self, gaze_score, head_score, blink_score, is_drowsy=False):
        """
        Calculate attention score from component scores.

        Args:
            gaze_score: float 0-1 (1 = looking at screen)
            head_score: float 0-1 (1 = facing screen)
            blink_score: float 0-1 (1 = normal blink rate)
            is_drowsy: bool (overrides to low score)

        Returns:
            dict: {
                'raw_score': float (0-100),
                'smoothed_score': float (0-100),
                'status': str ('Focused'/'Distracted'/'Drowsy'),
                'components': dict of individual scores,
            }
        """
        # Drowsy override
        if is_drowsy:
            raw_score = 10.0
        else:
            raw_score = (
                gaze_score * GAZE_WEIGHT +
                head_score * HEAD_POSE_WEIGHT +
                blink_score * BLINK_WEIGHT
            ) * 100.0

        raw_score = max(0.0, min(100.0, raw_score))

        # Exponential moving average smoothing
        self._smoothed_score = (
            self.ema_alpha * raw_score +
            (1 - self.ema_alpha) * self._smoothed_score
        )

        # Track history
        self._score_history.append({
            'time': time.time() - self.start_time,
            'score': self._smoothed_score,
        })
        if len(self._score_history) > self._max_history:
            self._score_history.pop(0)

        # Determine status
        if is_drowsy:
            status = "Drowsy"
        elif self._smoothed_score >= FOCUSED_THRESHOLD:
            status = "Focused"
        elif self._smoothed_score >= DISTRACTED_THRESHOLD:
            status = "Distracted"
        else:
            status = "Distracted"

        return {
            'raw_score': round(raw_score, 1),
            'smoothed_score': round(self._smoothed_score, 1),
            'status': status,
            'components': {
                'gaze': round(gaze_score * 100, 1),
                'head_pose': round(head_score * 100, 1),
                'blink': round(blink_score * 100, 1),
            },
        }

    def get_average_score(self):
        """Get average score over the session."""
        if not self._score_history:
            return 50.0
        return sum(s['score'] for s in self._score_history) / len(self._score_history)

    def get_score_timeline(self):
        """Get score history for graphing."""
        return list(self._score_history)

    def reset(self):
        """Reset for a new session."""
        self._smoothed_score = 50.0
        self._score_history = []
        self.start_time = time.time()
