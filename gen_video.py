import cv2
import numpy as np

# Video settings
width, height = 640, 480
fps = 20
duration_sec = 5
output_file = 'test_video.mp4'

# Define the codec and create VideoWriter object
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_file, fourcc, fps, (width, height))

for i in range(fps * duration_sec):
    # Create a frame with moving colored rectangles
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    cv2.rectangle(frame, (50 + i*2 % width, 100), (200 + i*2 % width, 300), (0, 255, 0), -1)
    cv2.putText(frame, f'Frame {i+1}', (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
    out.write(frame)