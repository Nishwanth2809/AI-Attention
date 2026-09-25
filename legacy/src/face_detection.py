"""
Face Detection module using MediaPipe Face Mesh.
Provides 468 facial landmarks per detected face.
"""

import cv2
import mediapipe as mp

try:
    from mediapipe.python.solutions import face_mesh as mp_face_mesh
    from mediapipe.python.solutions import drawing_utils as mp_drawing
    from mediapipe.python.solutions import drawing_styles as mp_drawing_styles
except Exception:
    import mediapipe.python.solutions.face_mesh as mp_face_mesh
    import mediapipe.python.solutions.drawing_utils as mp_drawing
    import mediapipe.python.solutions.drawing_styles as mp_drawing_styles


class FaceDetector:
    """Wraps MediaPipe Face Mesh for facial landmark detection."""

    def __init__(self, max_faces=1, min_detection_conf=0.5, min_tracking_conf=0.5):
        self.mp_face_mesh = mp_face_mesh
        if hasattr(self.mp_face_mesh, 'FaceMesh'):
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=max_faces,
                refine_landmarks=True,
                min_detection_confidence=min_detection_conf,
                min_tracking_confidence=min_tracking_conf,
            )
        else:
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                max_num_faces=max_faces,
                refine_landmarks=True,
                min_detection_confidence=min_detection_conf,
                min_tracking_confidence=min_tracking_conf,
            )
        self.mp_drawing = mp_drawing
        self.mp_drawing_styles = mp_drawing_styles

    def detect(self, frame):
        """
        Detect face landmarks in a BGR frame.

        Returns:
            list of landmark sets (each is a list of 478 NormalizedLandmarks),
            or empty list if no face found.
        """
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        results = self.face_mesh.process(rgb)

        if results.multi_face_landmarks:
            return [face.landmark for face in results.multi_face_landmarks]
        return []

    def draw_landmarks(self, frame, landmarks_list):
        """Draw face mesh landmarks on frame (for debugging)."""
        for face_landmarks in landmarks_list:
            # Reconstruct NormalizedLandmarkList for drawing
            landmark_list = type('', (), {})()
            landmark_list.landmark = face_landmarks
            self.mp_drawing.draw_landmarks(
                image=frame,
                landmark_list=landmark_list,
                connections=self.mp_face_mesh.FACEMESH_TESSELATION,
                landmark_drawing_spec=None,
                connection_drawing_spec=self.mp_drawing_styles.get_default_face_mesh_tesselation_style(),
            )
        return frame

    def close(self):
        """Release resources."""
        self.face_mesh.close()
