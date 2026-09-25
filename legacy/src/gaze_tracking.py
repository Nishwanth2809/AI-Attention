"""
Eye Gaze Tracking module.
Determines gaze direction using iris position relative to eye boundaries.
Requires MediaPipe Face Mesh with refine_landmarks=True (478 landmarks).
"""

import numpy as np

# MediaPipe iris landmark indices (only available with refine_landmarks=True)
# Right iris: 468-472 (center=468)
# Left iris: 473-477 (center=473)
RIGHT_IRIS_CENTER = 468
LEFT_IRIS_CENTER = 473

# Eye corner indices
RIGHT_EYE_INNER = 133
RIGHT_EYE_OUTER = 33
LEFT_EYE_INNER = 362
LEFT_EYE_OUTER = 263

# Eye top/bottom for vertical gaze
RIGHT_EYE_TOP = 159
RIGHT_EYE_BOTTOM = 145
LEFT_EYE_TOP = 386
LEFT_EYE_BOTTOM = 374


class GazeTracker:
    """Tracks eye gaze direction using iris landmarks."""

    # Thresholds (ratio-based, 0.5 = centered)
    HORIZONTAL_THRESHOLD = 0.35   # ratio from center
    VERTICAL_THRESHOLD = 0.30

    def __init__(self):
        self._gaze_history = []
        self._history_size = 5

    def track(self, landmarks, frame_w, frame_h):
        """
        Track gaze direction from landmarks.

        Returns:
            dict: {
                'horizontal_ratio': float (0=left, 0.5=center, 1=right),
                'vertical_ratio': float (0=top, 0.5=center, 1=bottom),
                'direction': str,
                'looking_at_screen': bool,
                'gaze_score': float (0-1),
            }
        """
        # Compute horizontal gaze ratio for each eye
        rh = self._horizontal_ratio(landmarks, frame_w,
                                     RIGHT_IRIS_CENTER, RIGHT_EYE_INNER, RIGHT_EYE_OUTER)
        lh = self._horizontal_ratio(landmarks, frame_w,
                                     LEFT_IRIS_CENTER, LEFT_EYE_INNER, LEFT_EYE_OUTER)
        
        # Compute vertical gaze ratio for each eye
        rv = self._vertical_ratio(landmarks, frame_h,
                                   RIGHT_IRIS_CENTER, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM)
        lv = self._vertical_ratio(landmarks, frame_h,
                                   LEFT_IRIS_CENTER, LEFT_EYE_TOP, LEFT_EYE_BOTTOM)

        # Average both eyes
        h_ratio = (rh + lh) / 2.0
        v_ratio = (rv + lv) / 2.0

        # Smooth
        self._gaze_history.append((h_ratio, v_ratio))
        if len(self._gaze_history) > self._history_size:
            self._gaze_history.pop(0)
        
        h_smooth = np.mean([g[0] for g in self._gaze_history])
        v_smooth = np.mean([g[1] for g in self._gaze_history])

        # Classify direction
        direction = self._classify_direction(h_smooth, v_smooth)
        looking_at_screen = (direction == "Center")

        # Score: 1.0 when looking at center, decreasing outward
        gaze_score = self._compute_gaze_score(h_smooth, v_smooth)

        return {
            'horizontal_ratio': float(h_smooth),
            'vertical_ratio': float(v_smooth),
            'direction': direction,
            'looking_at_screen': looking_at_screen,
            'gaze_score': gaze_score,
        }

    def _horizontal_ratio(self, landmarks, frame_w, iris_idx, inner_idx, outer_idx):
        """
        Compute horizontal position of iris between eye corners.
        Returns 0.0 (outer edge) to 1.0 (inner edge), ~0.5 = centered.
        """
        iris_x = landmarks[iris_idx].x * frame_w
        inner_x = landmarks[inner_idx].x * frame_w
        outer_x = landmarks[outer_idx].x * frame_w

        eye_width = abs(inner_x - outer_x)
        if eye_width < 1:
            return 0.5
        
        # Normalize iris position within eye
        ratio = (iris_x - min(inner_x, outer_x)) / eye_width
        return np.clip(ratio, 0, 1)

    def _vertical_ratio(self, landmarks, frame_h, iris_idx, top_idx, bottom_idx):
        """
        Compute vertical position of iris between eye top and bottom.
        Returns 0.0 (top) to 1.0 (bottom), ~0.5 = centered.
        """
        iris_y = landmarks[iris_idx].y * frame_h
        top_y = landmarks[top_idx].y * frame_h
        bottom_y = landmarks[bottom_idx].y * frame_h

        eye_height = abs(bottom_y - top_y)
        if eye_height < 1:
            return 0.5
        
        ratio = (iris_y - min(top_y, bottom_y)) / eye_height
        return np.clip(ratio, 0, 1)

    def _classify_direction(self, h_ratio, v_ratio):
        """Classify gaze direction from ratios."""
        h_center = abs(h_ratio - 0.5)
        v_center = abs(v_ratio - 0.5)

        if h_center < self.HORIZONTAL_THRESHOLD * 0.5 and v_center < self.VERTICAL_THRESHOLD * 0.5:
            return "Center"

        directions = []
        if h_ratio < 0.5 - self.HORIZONTAL_THRESHOLD * 0.5:
            directions.append("Left")
        elif h_ratio > 0.5 + self.HORIZONTAL_THRESHOLD * 0.5:
            directions.append("Right")

        if v_ratio < 0.5 - self.VERTICAL_THRESHOLD * 0.5:
            directions.append("Up")
        elif v_ratio > 0.5 + self.VERTICAL_THRESHOLD * 0.5:
            directions.append("Down")

        return " ".join(directions) if directions else "Center"

    def _compute_gaze_score(self, h_ratio, v_ratio):
        """
        Compute gaze attention score (0-1).
        1.0 = looking at center, 0.0 = looking completely away.
        """
        h_dev = abs(h_ratio - 0.5) * 2  # 0 to 1
        v_dev = abs(v_ratio - 0.5) * 2  # 0 to 1
        
        h_score = max(0.0, 1.0 - h_dev * 2.0)
        v_score = max(0.0, 1.0 - v_dev * 2.0)

        return 0.7 * h_score + 0.3 * v_score

    def reset(self):
        """Reset smoothing history."""
        self._gaze_history = []
