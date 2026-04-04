"""
Head Pose Estimation module.
Uses solvePnP with 6 key facial landmarks to estimate yaw, pitch, roll.
"""

import cv2
import numpy as np

# Key facial landmark indices for pose estimation (MediaPipe Face Mesh)
# Nose tip, chin, left eye corner, right eye corner, left mouth corner, right mouth corner
POSE_LANDMARKS = [1, 152, 33, 263, 61, 291]

# 3D model points (generic face model in arbitrary units)
MODEL_POINTS = np.array([
    (0.0, 0.0, 0.0),          # Nose tip
    (0.0, -330.0, -65.0),     # Chin
    (-225.0, 170.0, -135.0),  # Left eye left corner
    (225.0, 170.0, -135.0),   # Right eye right corner
    (-150.0, -150.0, -125.0), # Left mouth corner
    (150.0, -150.0, -125.0),  # Right mouth corner
], dtype=np.float64)


class HeadPoseEstimator:
    """Estimates head orientation (yaw, pitch, roll) from facial landmarks."""

    # Thresholds for attention
    YAW_THRESHOLD = 25.0    # degrees, looking left/right
    PITCH_THRESHOLD = 20.0  # degrees, looking up/down
    ROLL_THRESHOLD = 20.0   # degrees, head tilt

    def __init__(self):
        self._yaw_history = []
        self._pitch_history = []
        self._history_size = 7  # frames for smoothing

    def estimate(self, landmarks, frame_w, frame_h):
        """
        Estimate head pose from landmarks.

        Returns:
            dict: {
                'yaw': float (degrees),
                'pitch': float (degrees),
                'roll': float (degrees),
                'direction': str,
                'facing_screen': bool,
                'head_score': float (0-1),
            }
        """
        # Extract 2D image points
        image_points = np.array([
            (landmarks[idx].x * frame_w, landmarks[idx].y * frame_h)
            for idx in POSE_LANDMARKS
        ], dtype=np.float64)

        # Camera internals (approximation)
        focal_length = frame_w
        center = (frame_w / 2, frame_h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1],
        ], dtype=np.float64)
        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        # Solve PnP
        success, rotation_vector, translation_vector = cv2.solvePnP(
            MODEL_POINTS, image_points, camera_matrix, dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return {
                'yaw': 0, 'pitch': 0, 'roll': 0,
                'direction': 'unknown', 'facing_screen': True,
                'head_score': 0.5,
            }

        # Convert rotation vector to rotation matrix, then to Euler angles
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        proj_matrix = np.hstack((rotation_matrix, translation_vector))
        euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)[6]

        pitch = euler_angles[0][0]
        yaw = euler_angles[1][0]
        roll = euler_angles[2][0]

        # Clamp extreme values (solvePnP can produce wild estimates)
        pitch = np.clip(pitch, -90, 90)
        yaw = np.clip(yaw, -90, 90)
        roll = np.clip(roll, -90, 90)

        # Smooth
        self._yaw_history.append(yaw)
        self._pitch_history.append(pitch)
        if len(self._yaw_history) > self._history_size:
            self._yaw_history.pop(0)
            self._pitch_history.pop(0)
        
        yaw = np.mean(self._yaw_history)
        pitch = np.mean(self._pitch_history)

        # Direction classification
        direction = self._classify_direction(yaw, pitch)
        facing_screen = (abs(yaw) < self.YAW_THRESHOLD and abs(pitch) < self.PITCH_THRESHOLD)

        # Score: 1.0 when facing screen, decreasing as head turns away
        head_score = self._compute_head_score(yaw, pitch, roll)

        return {
            'yaw': float(yaw),
            'pitch': float(pitch),
            'roll': float(roll),
            'direction': direction,
            'facing_screen': facing_screen,
            'head_score': head_score,
        }

    def _classify_direction(self, yaw, pitch):
        """Classify head direction."""
        if abs(yaw) < self.YAW_THRESHOLD and abs(pitch) < self.PITCH_THRESHOLD:
            return "Forward"
        
        directions = []
        if yaw < -self.YAW_THRESHOLD:
            directions.append("Right")
        elif yaw > self.YAW_THRESHOLD:
            directions.append("Left")
        
        if pitch < -self.PITCH_THRESHOLD:
            directions.append("Down")
        elif pitch > self.PITCH_THRESHOLD:
            directions.append("Up")
        
        return " ".join(directions) if directions else "Forward"

    def _compute_head_score(self, yaw, pitch, roll):
        """
        Compute head pose attention score (0-1).
        1.0 = facing directly at screen, 0.0 = looking completely away.
        """
        yaw_score = max(0.0, 1.0 - abs(yaw) / 60.0)
        pitch_score = max(0.0, 1.0 - abs(pitch) / 50.0)
        roll_score = max(0.0, 1.0 - abs(roll) / 45.0)

        # Weighted: yaw matters most, then pitch, then roll
        return 0.5 * yaw_score + 0.35 * pitch_score + 0.15 * roll_score

    def reset(self):
        """Reset smoothing history."""
        self._yaw_history = []
        self._pitch_history = []
