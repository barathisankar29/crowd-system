import cv2
from ultralytics import YOLO

model = YOLO("yolov8s.pt")

ZONE_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"]

SOURCE_ZONE_PROFILES = {
    "video": {
        "mode": "grid",
        "rows": 3,
        "cols": 3,
        "x_margin_ratio": 0.00,
        "y_margin_ratio": 0.00,
        "conf": 0.18,
        "imgsz": 736
    },
    "webcam": {
        "mode": "grid",
        "rows": 3,
        "cols": 3,
        "x_margin_ratio": 0.08,
        "y_margin_ratio": 0.12,
        "conf": 0.20,
        "imgsz": 640
    }
}


def get_source_profile(source_key="video"):
    return SOURCE_ZONE_PROFILES.get(source_key, SOURCE_ZONE_PROFILES["video"])


def detect_people(frame, source_key="video"):
    profile = get_source_profile(source_key)
    conf = profile.get("conf", 0.18)
    imgsz = profile.get("imgsz", 736)

    results = model.predict(frame, conf=conf, verbose=False, imgsz=imgsz)
    boxes = []

    for r in results:
        for box in r.boxes:
            cls = int(box.cls[0])
            if cls == 0:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                boxes.append((x1, y1, x2, y2))

    return boxes


def _get_effective_zone_area(frame, source_key="video"):
    h, w, _ = frame.shape
    profile = get_source_profile(source_key)

    x_margin_ratio = profile.get("x_margin_ratio", 0.0)
    y_margin_ratio = profile.get("y_margin_ratio", 0.0)

    x_margin = int(w * x_margin_ratio)
    y_margin = int(h * y_margin_ratio)

    x_start = x_margin
    x_end = w - x_margin
    y_start = y_margin
    y_end = h - y_margin

    if x_end <= x_start:
        x_start, x_end = 0, w
    if y_end <= y_start:
        y_start, y_end = 0, h

    return x_start, y_start, x_end, y_end


def get_zone_layout(frame, source_key="video"):
    h, w, _ = frame.shape
    profile = get_source_profile(source_key)

    rows = profile.get("rows", 3)
    cols = profile.get("cols", 3)

    x_start, y_start, x_end, y_end = _get_effective_zone_area(frame, source_key)
    zone_w = max(1, (x_end - x_start) // cols)
    zone_h = max(1, (y_end - y_start) // rows)

    zones = []
    idx = 0

    for row in range(rows):
        for col in range(cols):
            if idx >= len(ZONE_NAMES):
                break

            zx1 = x_start + col * zone_w
            zy1 = y_start + row * zone_h

            if col == cols - 1:
                zx2 = x_end
            else:
                zx2 = x_start + (col + 1) * zone_w

            if row == rows - 1:
                zy2 = y_end
            else:
                zy2 = y_start + (row + 1) * zone_h

            zones.append({
                "name": ZONE_NAMES[idx],
                "x1": zx1,
                "y1": zy1,
                "x2": zx2,
                "y2": zy2,
                "row": row,
                "col": col
            })
            idx += 1

    return zones


def point_to_zone(frame, cx, cy, source_key="video"):
    zones = get_zone_layout(frame, source_key)

    for zone in zones:
        if zone["x1"] <= cx < zone["x2"] and zone["y1"] <= cy < zone["y2"]:
            return zone["name"]

    return None


def get_zone_counts(frame, detections, source_key="video"):
    zone_counts = {name: 0 for name in ZONE_NAMES}

    for (x1, y1, x2, y2) in detections:
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2

        zone_name = point_to_zone(frame, cx, cy, source_key)
        if zone_name is not None:
            zone_counts[zone_name] += 1

    return zone_counts


def draw_zone_grid(frame, source_key="video"):
    zones = get_zone_layout(frame, source_key)

    for zone in zones:
        cv2.rectangle(
            frame,
            (zone["x1"], zone["y1"]),
            (zone["x2"], zone["y2"]),
            (255, 255, 0),
            2
        )

        cv2.putText(
            frame,
            zone["name"],
            (zone["x1"] + 8, zone["y1"] + 22),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 255, 0),
            2
        )

    x_start, y_start, x_end, y_end = _get_effective_zone_area(frame, source_key)
    cv2.rectangle(frame, (x_start, y_start), (x_end, y_end), (120, 220, 255), 1)


def draw_zone_counts(frame, zone_counts, source_key="video"):
    zones = get_zone_layout(frame, source_key)

    for zone in zones:
        count = zone_counts.get(zone["name"], 0)
        label_x = zone["x1"] + 8
        label_y = min(zone["y1"] + 46, zone["y2"] - 8)

        cv2.putText(
            frame,
            f"{zone['name']}: {count}",
            (label_x, label_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.70,
            (0, 255, 255),
            2
        )


def build_detection_summary(frame, detections, source_key="video"):
    zone_counts = get_zone_counts(frame, detections, source_key)
    total_people = len(detections)

    occupied_zones = sum(1 for v in zone_counts.values() if v > 0)
    max_zone_load = max(zone_counts.values()) if zone_counts else 0

    return {
        "total_people": total_people,
        "zone_counts": zone_counts,
        "occupied_zones": occupied_zones,
        "max_zone_load": max_zone_load,
        "source_key": source_key
    }