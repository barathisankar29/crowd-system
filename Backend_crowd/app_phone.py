from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import threading
import time
from main import detect_people, get_zone_counts

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

data_lock = threading.Lock()
frame_lock = threading.Lock()
source_lock = threading.Lock()

global_data = {
    "count": 0,
    "density": 0,
    "status": "safe",
    "zones": {},
    "alerts": [],
    "source": "phone",
    "source_label": "Phone CCTV",
    "source_name": "IP Webcam",
    "camera_mode": "camera",
    "anomalyScore": 0
}

NORMALIZATION_FACTOR = 10000

BASE_ZONE_CAPACITY = {
    k: 5 for k in [
        "A", "B", "C",
        "D", "E", "F",
        "G", "H", "I"
    ]
}

SOURCE_CONFIG = {

    "phone": {
        "label": "Phone CCTV",
        "name": "IP Webcam",
        "type": "camera",
        "value": "http://10.83.71.218:8080/video",
        "zone_scale": 1.0
    }

}

current_source_key = "phone"

cap = None
source_fps = 25.0

latest_raw_frame = None
latest_stream_jpeg = None
latest_heatmap_jpeg = None
latest_detections = []

latest_zone_counts = {
    k: 0 for k in [
        "A", "B", "C",
        "D", "E", "F",
        "G", "H", "I"
    ]
}

running_capture = True


def open_capture_for_source(source_key: str):

    cfg = SOURCE_CONFIG[source_key]

    capture = cv2.VideoCapture(cfg["value"])

    if not capture.isOpened():
        return None, 25.0

    fps = capture.get(cv2.CAP_PROP_FPS)

    if not fps or fps <= 1:
        fps = 25.0

    return capture, fps


def close_capture():

    global cap

    if cap is not None:

        try:
            cap.release()

        except Exception:
            pass

        cap = None


def init_video(source_key="phone"):

    global cap
    global source_fps
    global current_source_key

    with source_lock:

        close_capture()

        cap, fps = open_capture_for_source(source_key)

        if cap is None:
            raise RuntimeError(
                f"Unable to open source: {source_key}"
            )

        source_fps = fps
        current_source_key = source_key

        cfg = SOURCE_CONFIG[source_key]

        with data_lock:

            global_data["source"] = source_key
            global_data["source_label"] = cfg["label"]
            global_data["source_name"] = cfg["name"]
            global_data["camera_mode"] = cfg["type"]


def get_zone_capacity_map():

    cfg = SOURCE_CONFIG.get(
        current_source_key,
        SOURCE_CONFIG["phone"]
    )

    scale = cfg.get("zone_scale", 1.0)

    return {
        k: max(1, int(v * scale))
        for k, v in BASE_ZONE_CAPACITY.items()
    }


def get_zone_status(count: int, capacity: int):

    if capacity <= 0:
        return "SAFE", "Area is under control"

    fill = (count / capacity) * 100

    if fill >= 80:
        return "HIGH", "Heavy crowd detected"

    if fill >= 50:
        return "MODERATE", "Crowd building up"

    return "SAFE", "Area is under control"


def build_zone_payload(zone_counts):

    capacities = get_zone_capacity_map()

    zones = []

    for zone_name in [
        "A", "B", "C",
        "D", "E", "F",
        "G", "H", "I"
    ]:

        count = int(zone_counts.get(zone_name, 0))

        capacity = int(
            capacities.get(zone_name, 5)
        )

        status, message = get_zone_status(
            count,
            capacity
        )

        zones.append({
            "id": f"zone-{zone_name.lower()}",
            "name": f"Zone {zone_name}",
            "count": count,
            "capacity": capacity,
            "status": status,
            "message": message
        })

    return zones


def build_alerts(
        zone_counts,
        total_count,
        overall_status,
        anomaly_score=0.0
):

    alerts = []

    now_str = time.strftime("%H:%M:%S")

    capacities = get_zone_capacity_map()

    for zone_name in [
        "A", "B", "C",
        "D", "E", "F",
        "G", "H", "I"
    ]:

        count = int(
            zone_counts.get(zone_name, 0)
        )

        capacity = int(
            capacities.get(zone_name, 5)
        )

        fill = (
            (count / capacity) * 100
            if capacity > 0 else 0
        )

        if fill >= 80:

            alerts.append({
                "id": f"alert-{zone_name}-high",
                "title": f"Zone {zone_name} is crowded",
                "severity": "HIGH",
                "timestamp": now_str
            })

        elif fill >= 50:

            alerts.append({
                "id": f"alert-{zone_name}-moderate",
                "title": f"Zone {zone_name} crowd rising",
                "severity": "MODERATE",
                "timestamp": now_str
            })

    if total_count == 0:

        alerts.append({
            "id": "alert-none",
            "title": "No people detected",
            "severity": "INFO",
            "timestamp": now_str
        })

    elif overall_status == "safe":

        alerts.append({
            "id": "alert-safe",
            "title": "Overall crowd level is safe",
            "severity": "INFO",
            "timestamp": now_str
        })

    if anomaly_score >= 0.65:

        alerts.append({
            "id": "alert-anomaly-high",
            "title": "Anomaly detected",
            "severity": "HIGH",
            "timestamp": now_str
        })

    return alerts


def draw_grid(frame):

    h, w, _ = frame.shape

    for i in range(1, 3):

        cv2.line(
            frame,
            (0, i * h // 3),
            (w, i * h // 3),
            (255, 255, 0),
            2
        )

        cv2.line(
            frame,
            (i * w // 3, 0),
            (i * w // 3, h),
            (255, 255, 0),
            2
        )


def draw_zone_counts(frame, zone_counts):

    h, w, _ = frame.shape

    zone_names = [
        "A", "B", "C",
        "D", "E", "F",
        "G", "H", "I"
    ]

    for idx, name in enumerate(zone_names):

        row = idx // 3
        col = idx % 3

        x = col * (w // 3) + 12
        y = row * (h // 3) + 34

        count = zone_counts.get(name, 0)

        cv2.putText(
            frame,
            f"{name}: {count}",
            (x, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2
        )


def encode_jpg(frame, quality=78):

    ok, buffer = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    )

    if not ok:
        return None

    return buffer.tobytes()


def compute_anomaly_score(num_people, zone_counts):

    capacities = get_zone_capacity_map()

    zone_values = []

    for z in [
        "A", "B", "C",
        "D", "E", "F",
        "G", "H", "I"
    ]:

        c = int(zone_counts.get(z, 0))

        cap = int(capacities.get(z, 5))

        zone_values.append(
            (c / cap) if cap > 0 else 0
        )

    avg_fill = (
        sum(zone_values) / len(zone_values)
        if zone_values else 0
    )

    peak_fill = max(zone_values) if zone_values else 0

    crowd_factor = min(
        1.0,
        num_people / 12.0
    )

    imbalance = max(
        0.0,
        peak_fill - avg_fill
    )

    score = (
        (0.45 * crowd_factor)
        + (0.35 * peak_fill)
        + (0.20 * imbalance)
    )

    return max(0.0, min(1.0, score))


def capture_frames():

    global latest_raw_frame
    global running_capture
    global cap

    frame_delay = 1.0 / max(source_fps, 25.0)

    while running_capture:

        with source_lock:
            local_cap = cap

        if local_cap is None:
            time.sleep(0.05)
            continue

        success, frame = local_cap.read()

        if not success:
            time.sleep(0.02)
            continue

        frame = cv2.resize(frame, (640, 360))

        with frame_lock:
            latest_raw_frame = frame.copy()

        time.sleep(frame_delay)


def detection_loop():

    global latest_stream_jpeg
    global latest_heatmap_jpeg
    global latest_detections
    global latest_zone_counts

    last_infer_time = 0

    infer_interval = 0.12

    while running_capture:

        now = time.time()

        if now - last_infer_time < infer_interval:
            time.sleep(0.01)
            continue

        with frame_lock:

            if latest_raw_frame is None:
                time.sleep(0.01)
                continue

            frame = latest_raw_frame.copy()

        detections = detect_people(frame)

        num_people = len(detections)

        zone_counts = get_zone_counts(
            frame,
            detections
        )

        annotated = frame.copy()

        for (x1, y1, x2, y2) in detections:

            cv2.rectangle(
                annotated,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

        draw_grid(annotated)

        draw_zone_counts(
            annotated,
            zone_counts
        )

        frame_area = (
            annotated.shape[0]
            * annotated.shape[1]
        )

        density = (
            (num_people / frame_area)
            * NORMALIZATION_FACTOR
        )

        if num_people > 8:

            status = "high"

            color = (0, 0, 255)

        elif num_people > 4:

            status = "moderate"

            color = (0, 255, 255)

        else:

            status = "safe"

            color = (0, 255, 0)

        anomaly_score = compute_anomaly_score(
            num_people,
            zone_counts
        )

        cv2.putText(
            annotated,
            f"Count: {num_people}",
            (10, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            color,
            2
        )

        cv2.putText(
            annotated,
            f"Density: {density:.2f}",
            (10, 68),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            color,
            2
        )

        cv2.putText(
            annotated,
            f"Status: {status}",
            (10, 104),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            color,
            2
        )

        cv2.putText(
            annotated,
            f"Anomaly: {anomaly_score:.2f}",
            (10, 140),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (255, 165, 0),
            2
        )

        heatmap_img = frame.copy()

        for (x1, y1, x2, y2) in detections:

            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2

            cv2.circle(
                heatmap_img,
                (cx, cy),
                28,
                (0, 0, 255),
                -1
            )

        heatmap_img = cv2.GaussianBlur(
            heatmap_img,
            (41, 41),
            0
        )

        alerts = build_alerts(
            zone_counts,
            num_people,
            status,
            anomaly_score
        )

        stream_jpeg = encode_jpg(
            annotated,
            quality=78
        )

        heatmap_jpeg = encode_jpg(
            heatmap_img,
            quality=76
        )

        with frame_lock:

            latest_stream_jpeg = stream_jpeg
            latest_heatmap_jpeg = heatmap_jpeg
            latest_detections = detections
            latest_zone_counts = zone_counts

        with data_lock:

            global_data["count"] = num_people
            global_data["density"] = round(density, 2)
            global_data["status"] = status
            global_data["zones"] = zone_counts
            global_data["alerts"] = alerts
            global_data["anomalyScore"] = round(anomaly_score, 2)

        last_infer_time = now


def generate_frames():

    while True:

        with frame_lock:
            frame_bytes = latest_stream_jpeg

        if frame_bytes is None:
            time.sleep(0.01)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame_bytes +
            b"\r\n"
        )

        time.sleep(0.01)


@app.route("/video_feed")
def video_feed():

    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/metrics")
def metrics():

    with data_lock:

        zone_payload = build_zone_payload(
            global_data["zones"]
        )

        return jsonify({
            "totalCount": global_data["count"],
            "density": global_data["density"],
            "overallStatus": global_data["status"].upper(),
            "zones": zone_payload,
            "anomalyScore": global_data["anomalyScore"]
        })


@app.route("/alerts")
def alerts():

    with data_lock:
        return jsonify(global_data["alerts"])


@app.route("/heatmap")
def heatmap():

    with frame_lock:

        if latest_heatmap_jpeg is None:

            return jsonify({
                "error": "No heatmap available"
            }), 500

        heatmap_bytes = latest_heatmap_jpeg

    return Response(
        heatmap_bytes,
        mimetype="image/jpeg"
    )


if __name__ == "__main__":

    init_video("phone")

    capture_thread = threading.Thread(
        target=capture_frames,
        daemon=True
    )

    detect_thread = threading.Thread(
        target=detection_loop,
        daemon=True
    )

    capture_thread.start()
    detect_thread.start()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        threaded=True
    )