import cv2
from ultralytics import YOLO

# 🔥 Load YOLO model
model = YOLO("yolov8m.pt")

# 🔥 Detect people (bounding boxes)
def detect_people(frame):
    results = model(frame, conf=0.15)
    boxes = []

    for r in results:
        for box in r.boxes:
            cls = int(box.cls[0])
            if cls == 0:  # person class
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                boxes.append((x1, y1, x2, y2))

    return boxes


# 🔥 ZONE LOGIC (3x3 GRID)
def get_zone_counts(frame, detections):
    h, w, _ = frame.shape

    rows, cols = 3, 3
    zone_h = h // rows
    zone_w = w // cols

    zone_names = ['A','B','C','D','E','F','G','H','I']
    zone_counts = {name: 0 for name in zone_names}

    for (x1, y1, x2, y2) in detections:
        # center of bounding box
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2

        col = min(cx // zone_w, 2)
        row = min(cy // zone_h, 2)

        zone_index = int(row * cols + col)
        zone_name = zone_names[zone_index]

        zone_counts[zone_name] += 1

    return zone_counts