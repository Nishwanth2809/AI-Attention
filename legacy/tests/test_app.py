import io
import os
import sqlite3
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import cv2
import numpy as np

# Importing the application must never touch the user's session database in tests.
_database = tempfile.TemporaryDirectory()
os.environ['ATTENTION_DB_PATH'] = os.path.join(_database.name, 'attention.db')
import app as backend
from src.attention_score import AttentionScorer


class AppTests(unittest.TestCase):
    def setUp(self):
        backend.state = backend.AppState()
        self.uploads = tempfile.TemporaryDirectory()
        backend.app.config.update(TESTING=True, UPLOAD_FOLDER=self.uploads.name)
        self.client = backend.app.test_client()
        self.image = cv2.imencode('.jpg', np.zeros((32, 32, 3), dtype=np.uint8))[1].tobytes()

    def tearDown(self):
        self.uploads.cleanup()

    def post_frame(self, client=None, **fields):
        return (client or self.client).post('/process_frame', data={
            'frame': (io.BytesIO(self.image), 'frame.jpg'), **fields})

    def test_empty_and_invalid_images(self):
        for data in (b'', b'not an image'):
            response = self.client.post('/process_frame', data={'frame': (io.BytesIO(data), 'x.jpg')})
            self.assertEqual(response.status_code, 400)
        self.assertIsNone(backend.state.session_id)

    def test_stop_finalizes_browser_session_and_rejects_late_frames(self):
        session = self.client.post('/start_feed').json['session_id']
        backend.state.attention_scorer.calculate(1, 1, 1)
        self.assertEqual(self.client.post('/stop_feed', json={'session_id': session}).status_code, 200)
        detail = self.client.get(f'/api/sessions/{session}').json['session']
        self.assertEqual(detail['status'], 'complete')
        self.assertEqual(detail['avg_score'], 65)
        self.assertEqual(self.post_frame(session_id=str(session)).status_code, 409)
        self.assertIsNone(backend.state.session_id)

    def test_old_stop_cannot_end_new_session(self):
        old = self.client.post('/start_feed').json['session_id']
        self.client.post('/stop_feed')
        new = self.client.post('/start_feed').json['session_id']
        self.client.post('/stop_feed', json={'session_id': old})
        self.assertEqual(backend.state.session_id, new)
        self.assertEqual(self.client.post('/start_feed').status_code, 409)

    def test_upload_names_are_safe_and_unique(self):
        names = []
        for _ in range(2):
            response = self.client.post('/upload_video', data={'video': (io.BytesIO(b'video'), '../../sample.mp4')})
            self.assertEqual(response.status_code, 200)
            name = response.json['filename']
            self.assertNotIn('/', name)
            self.assertNotIn('\\', name)
            self.assertTrue(os.path.isfile(os.path.join(self.uploads.name, name)))
            names.append(name)
        self.assertNotEqual(*names)

    def test_processing_is_serialized_and_no_face_is_logged(self):
        class Detector:
            active = 0
            maximum = 0
            def detect(self, frame):
                self.active += 1
                self.maximum = max(self.maximum, self.active)
                time.sleep(.02)
                self.active -= 1
                return []
        detector = Detector()
        backend.state._face_detector = detector
        session = self.client.post('/start_feed').json['session_id']
        def send(_):
            with backend.app.test_client() as client:
                return self.post_frame(client, session_id=str(session)).status_code
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertEqual(list(pool.map(send, range(4))), [200] * 4)
        self.assertEqual(detector.maximum, 1)
        self.assertEqual(len(self.client.get(f'/api/sessions/{session}').json['scores']), 1)

    def test_logging_uses_time_not_frame_count(self):
        session = self.client.post('/start_feed').json['session_id']
        with patch.object(backend.time, 'monotonic', side_effect=[10, 10.2, 11.1]):
            for _ in range(3):
                backend.log_current_score()
        self.assertEqual(len(self.client.get(f'/api/sessions/{session}').json['scores']), 2)

    def test_json_frames_skip_overlay(self):
        backend.state._face_detector = type('Detector', (), {'detect': lambda self, frame: []})()
        with patch.object(backend, 'draw_score_overlay') as draw:
            self.assertEqual(self.post_frame().status_code, 200)
            draw.assert_not_called()

    def test_stream_disconnect_releases_capture_and_finishes(self):
        class Capture:
            released = False
            def isOpened(self): return True
            def get(self, prop): return float('nan')
            def read(self): return True, np.zeros((32, 32, 3), dtype=np.uint8)
            def release(self): self.released = True
        cap = Capture()
        with patch.object(backend.cv2, 'VideoCapture', return_value=cap), patch.object(backend, 'process_frame', side_effect=lambda f: f):
            stream = backend.gen_video_file('test.mp4')
            next(stream)
            session = backend.state.session_id
            stream.close()
        self.assertTrue(cap.released)
        self.assertFalse(backend.state.session_active)
        self.assertEqual(self.client.get(f'/api/sessions/{session}').json['session']['status'], 'complete')

    def test_no_face_timeout_and_history_are_based_on_elapsed_time(self):
        backend.state._face_detector = type('Detector', (), {'detect': lambda self, frame: []})()
        frame = np.zeros((32, 32, 3), dtype=np.uint8)
        backend.state.blink_detector.recent_blinks = [1, 2]
        backend.state.blink_detector.eye_closed = True
        with patch.object(backend.time, 'monotonic', side_effect=[10, 10, 10.6, 10.6]):
            backend.process_frame(frame, annotate=False)
            backend.process_frame(frame, annotate=False)
        self.assertEqual(backend.state.current_status, 'No Face Detected')
        self.assertAlmostEqual(backend.state.current_score, 32)
        self.assertAlmostEqual(backend.state.attention_scorer.get_average_score(), 41)
        self.assertFalse(backend.state.blink_detector.eye_closed)
        self.assertEqual(backend.state.blink_detector.recent_blinks, [1, 2])

    def test_large_frame_is_resized_before_detection(self):
        sizes = []
        class Detector:
            def detect(self, frame):
                sizes.append(frame.shape[:2])
                return []
        backend.state._face_detector = Detector()
        self.image = cv2.imencode('.jpg', np.zeros((900, 1200, 3), dtype=np.uint8))[1].tobytes()
        self.assertEqual(self.post_frame().status_code, 200)
        self.assertEqual(sizes, [(480, 640)])

    def test_oversized_frame_rejected(self):
        response = self.client.post('/process_frame', data={'frame': (io.BytesIO(b'x' * (2 * 1024 * 1024 + 1)), 'x.jpg')})
        self.assertEqual(response.status_code, 400)

    def test_full_session_average_with_bounded_history(self):
        scorer = AttentionScorer(ema_alpha=1)
        for _ in range(300): scorer.calculate(1, 1, 1)
        for _ in range(300): scorer.calculate(0, 0, 0)
        self.assertEqual(scorer.get_average_score(), 50)
        self.assertEqual(len(scorer.get_score_timeline()), 300)
        self.assertEqual(scorer.get_score_timeline()[-1]['score'], 0)
        scorer.reset()
        self.assertEqual(scorer.get_average_score(), 50)
        self.assertEqual(scorer.get_score_timeline(), [])


if __name__ == '__main__':
    unittest.main()
