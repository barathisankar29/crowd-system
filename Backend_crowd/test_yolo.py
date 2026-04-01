from ultralytics import YOLO
import cv2
import numpy as np
import time
import os

# ---------------- SETUP ---------------- #
model = YOLO("yolov8s.pt")
VIDEO_PATH = "crowd.mp4"

FRAME_WIDTH = 640
FRAME_HEIGHT = 480

# ✅ Create output folder
OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

OUTPUT_PATH = os.path.join(OUTPUT_DIR, "output.mp4")

# ✅ MP4 codec (very important)
fourcc = cv2.VideoWriter_fourcc(*'mp4v')

out = cv2.VideoWriter(
    OUTPUT_PATH,
    fourcc,
    20.0,
    (FRAME_WIDTH, FRAME_HEIGHT)
)

print(f"[INFO] Saving video to: {OUTPUT_PATH} - test_yolo.py:30")

# ---------------- VARIABLES ---------------- #
prev_total = 0

crowd_history = []
WINDOW_SIZE = 5
PREDICT_SECONDS = 30

# ---------------- YOLO ---------------- #
results = model(VIDEO_PATH, stream=True, imgsz=640, vid_stride=2)

for r in results:

    frame = r.plot()
    frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
    h, w = frame.shape[:2]

    person_count = 0

    # ---------------- DETECTION ---------------- #
    if r.boxes is not None:
        for box in r.boxes.data:
            if int(box[5]) == 0:
                person_count += 1

    # Smooth count
    person_count = int(0.6 * prev_total + 0.4 * person_count)

    # ---------------- STATUS ---------------- #
    if person_count < 10:
        label, color = "SAFE", (0,255,0)
    elif person_count < 25:
        label, color = "MODERATE", (0,255,255)
    else:
        label, color = "HIGH", (0,0,255)

    cv2.putText(frame, f"People: {person_count}", (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)

    cv2.putText(frame, f"Status: {label}", (20, 80),
                cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

    # ---------------- PREDICTION ---------------- #
    current_time = time.time()
    crowd_history.append((current_time, person_count))

    if len(crowd_history) > WINDOW_SIZE:
        crowd_history.pop(0)

    if len(crowd_history) >= 2:
        t1, c1 = crowd_history[0]
        t2, c2 = crowd_history[-1]

        if t2 - t1 > 0:
            rate = (c2 - c1) / (t2 - t1)
            pred = int(c2 + rate * PREDICT_SECONDS)

            cv2.putText(frame, f"Pred (30s): {pred}", (20, 120),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,0), 2)

            if pred > 30:
                cv2.putText(frame, "Overcrowding Incoming!",
                            (20, 160),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.8, (0,0,255), 3)

    prev_total = person_count

    # ================= ZONE SYSTEM ================= #
    GRID_ROWS, GRID_COLS = 3, 3

    zone_h = h // GRID_ROWS
    zone_w = w // GRID_COLS

    zone_counts = np.zeros((GRID_ROWS, GRID_COLS), dtype=int)

    if r.boxes is not None:
        for box in r.boxes.data:
            if int(box[5]) == 0:
                x1, y1, x2, y2 = map(int, box[:4])
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2

                row = min(cy // zone_h, GRID_ROWS - 1)
                col = min(cx // zone_w, GRID_COLS - 1)

                zone_counts[row][col] += 1

    max_pos = np.unravel_index(np.argmax(zone_counts), zone_counts.shape)

    overlay = frame.copy()

    for i in range(GRID_ROWS):
        for j in range(GRID_COLS):

            x1 = j * zone_w
            y1 = i * zone_h
            x2 = x1 + zone_w
            y2 = y1 + zone_h

            count = zone_counts[i][j]

            if count < 2:
                z_color = (0,255,0)
            elif count < 5:
                z_color = (0,255,255)
            else:
                z_color = (0,0,255)

            if (i, j) == max_pos and count > 0:
                z_color = (255,0,255)

            cv2.rectangle(overlay, (x1,y1), (x2,y2), z_color, -1)

    frame = cv2.addWeighted(overlay, 0.25, frame, 0.75, 0)

    # ---------------- SAVE + DISPLAY ---------------- #
    out.write(frame)
    cv2.imshow("Crowd Monitor", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# ---------------- CLEANUP ---------------- #
out.release()
cv2.destroyAllWindows()

print("[INFO] Video saved successfully! - test_yolo.py:158")