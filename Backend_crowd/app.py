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
    "source": "video",
    "source_label": "Video File",
    "source_name": "cctv.mp4",
    "camera_mode": "video",
    "anomalyScore": 0
}

NORMALIZATION_FACTOR = 10000
BASE_ZONE_CAPACITY = {k: 5 for k in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]}

SOURCE_CONFIG = {
    "video": {
        "label": "Video File",
        "name": "cctv.mp4",
        "type": "file",
        "value": "cctv.mp4",
        "zone_scale": 1.0
    },
    "webcam": {
        "label": "Live Webcam",
        "name": "Webcam 0",
        "type": "camera",
        "value": 0,
        "zone_scale": 0.7
    }
}

current_source_key = "video"
cap = None
source_fps = 25.0

latest_raw_frame = None
latest_stream_jpeg = None
latest_heatmap_jpeg = None
latest_detections = []
latest_zone_counts = {k: 0 for k in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]}
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


def init_video(source_key="video"):
    global cap, source_fps, current_source_key
    with source_lock:
        close_capture()
        cap, fps = open_capture_for_source(source_key)
        if cap is None:
            raise RuntimeError(f"Unable to open source: {source_key}")

        source_fps = fps
        current_source_key = source_key
        cfg = SOURCE_CONFIG[source_key]

        with data_lock:
            global_data["source"] = source_key
            global_data["source_label"] = cfg["label"]
            global_data["source_name"] = cfg["name"]
            global_data["camera_mode"] = cfg["type"]


def switch_source(source_key: str):
    if source_key not in SOURCE_CONFIG:
        return False, f"Invalid source '{source_key}'"

    global latest_raw_frame, latest_stream_jpeg, latest_heatmap_jpeg, latest_detections, latest_zone_counts
    global cap, source_fps, current_source_key

    with source_lock:
        close_capture()
        new_cap, fps = open_capture_for_source(source_key)
        if new_cap is None:
            return False, f"Failed to open source '{source_key}'"

        cap = new_cap
        source_fps = fps
        current_source_key = source_key
        cfg = SOURCE_CONFIG[source_key]

        latest_raw_frame = None
        latest_stream_jpeg = None
        latest_heatmap_jpeg = None
        latest_detections = []
        latest_zone_counts = {k: 0 for k in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]}

        with data_lock:
            global_data["source"] = source_key
            global_data["source_label"] = cfg["label"]
            global_data["source_name"] = cfg["name"]
            global_data["camera_mode"] = cfg["type"]
            global_data["count"] = 0
            global_data["density"] = 0
            global_data["status"] = "safe"
            global_data["zones"] = {}
            global_data["alerts"] = []
            global_data["anomalyScore"] = 0

    return True, f"Switched to {cfg['label']}"


def get_zone_capacity_map():
    cfg = SOURCE_CONFIG.get(current_source_key, SOURCE_CONFIG["video"])
    scale = cfg.get("zone_scale", 1.0)
    return {k: max(1, int(v * scale)) for k, v in BASE_ZONE_CAPACITY.items()}


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
    for zone_name in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]:
        count = int(zone_counts.get(zone_name, 0))
        capacity = int(capacities.get(zone_name, 5))
        status, message = get_zone_status(count, capacity)
        zones.append({
            "id": f"zone-{zone_name.lower()}",
            "name": f"Zone {zone_name}",
            "count": count,
            "capacity": capacity,
            "status": status,
            "message": message
        })
    return zones


def build_alerts(zone_counts, total_count, overall_status, anomaly_score=0.0):
    alerts = []
    now_str = time.strftime("%H:%M:%S")
    capacities = get_zone_capacity_map()

    for zone_name in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]:
        count = int(zone_counts.get(zone_name, 0))
        capacity = int(capacities.get(zone_name, 5))
        fill = (count / capacity) * 100 if capacity > 0 else 0

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
            "title": "Anomaly detected in movement pattern",
            "severity": "HIGH",
            "timestamp": now_str
        })
    elif anomaly_score >= 0.35:
        alerts.append({
            "id": "alert-anomaly-mid",
            "title": "Unusual crowd activity detected",
            "severity": "MODERATE",
            "timestamp": now_str
        })

    return alerts


def draw_grid(frame):
    h, w, _ = frame.shape
    for i in range(1, 3):
        cv2.line(frame, (0, i * h // 3), (w, i * h // 3), (255, 255, 0), 2)
        cv2.line(frame, (i * w // 3, 0), (i * w // 3, h), (255, 255, 0), 2)


def draw_zone_counts(frame, zone_counts):
    h, w, _ = frame.shape
    zone_names = ["A", "B", "C", "D", "E", "F", "G", "H", "I"]

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
    ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        return None
    return buffer.tobytes()


def compute_anomaly_score(num_people, zone_counts, source_key):
    capacities = get_zone_capacity_map()
    zone_values = []

    for z in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]:
        c = int(zone_counts.get(z, 0))
        cap = int(capacities.get(z, 5))
        zone_values.append((c / cap) if cap > 0 else 0)

    avg_fill = sum(zone_values) / len(zone_values) if zone_values else 0
    peak_fill = max(zone_values) if zone_values else 0
    crowd_factor = min(1.0, num_people / 12.0)
    imbalance = max(0.0, peak_fill - avg_fill)
    source_boost = 1.0 if source_key == "video" else 0.9

    score = (0.45 * crowd_factor) + (0.35 * peak_fill) + (0.20 * imbalance)
    score *= source_boost
    return max(0.0, min(1.0, score))


def capture_frames():
    global latest_raw_frame, running_capture, cap
    frame_delay = 1.0 / max(source_fps, 25.0)

    while running_capture:
        with source_lock:
            local_cap = cap

        if local_cap is None:
            time.sleep(0.05)
            continue

        success, frame = local_cap.read()

        if not success:
            if current_source_key == "video":
                local_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            else:
                time.sleep(0.02)
            continue

        frame = cv2.resize(frame, (640, 360))

        with frame_lock:
            latest_raw_frame = frame.copy()

        time.sleep(frame_delay)


def detection_loop():
    global latest_stream_jpeg, latest_heatmap_jpeg, latest_detections, latest_zone_counts

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
        zone_counts = get_zone_counts(frame, detections)

        annotated = frame.copy()
        for (x1, y1, x2, y2) in detections:
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)

        draw_grid(annotated)
        draw_zone_counts(annotated, zone_counts)

        frame_area = annotated.shape[0] * annotated.shape[1]
        density = (num_people / frame_area) * NORMALIZATION_FACTOR

        if num_people > 8:
            status = "high"
            color = (0, 0, 255)
        elif num_people > 4:
            status = "moderate"
            color = (0, 255, 255)
        else:
            status = "safe"
            color = (0, 255, 0)

        anomaly_score = compute_anomaly_score(num_people, zone_counts, current_source_key)

        cv2.putText(annotated, f"Count: {num_people}", (10, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(annotated, f"Density: {density:.2f}", (10, 68), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(annotated, f"Status: {status}", (10, 104), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(annotated, f"Anomaly: {anomaly_score:.2f}", (10, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 165, 0), 2)

        heatmap_img = frame.copy()
        for (x1, y1, x2, y2) in detections:
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            cv2.circle(heatmap_img, (cx, cy), 28, (0, 0, 255), -1)
        heatmap_img = cv2.GaussianBlur(heatmap_img, (41, 41), 0)

        alerts = build_alerts(zone_counts, num_people, status, anomaly_score=anomaly_score)

        stream_jpeg = encode_jpg(annotated, quality=78)
        heatmap_jpeg = encode_jpg(heatmap_img, quality=76)

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
            global_data["source"] = current_source_key
            global_data["source_label"] = SOURCE_CONFIG[current_source_key]["label"]
            global_data["source_name"] = SOURCE_CONFIG[current_source_key]["name"]
            global_data["camera_mode"] = SOURCE_CONFIG[current_source_key]["type"]

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
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

        time.sleep(0.01)


@app.route("/sources")
def sources():
    return jsonify([
        {
            "id": key,
            "label": cfg["label"],
            "name": cfg["name"],
            "type": cfg["type"],
            "zoneScale": cfg["zone_scale"]
        }
        for key, cfg in SOURCE_CONFIG.items()
    ])


@app.route("/switch_source", methods=["POST"])
def api_switch_source():
    payload = request.get_json(silent=True) or {}
    source_key = payload.get("source", "video")
    ok, message = switch_source(source_key)
    return jsonify({
        "success": ok,
        "message": message,
        "source": source_key if ok else current_source_key
    }), (200 if ok else 400)


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Accel-Buffering": "no",
        },
    )


@app.route("/status")
def status():
    with data_lock:
        return jsonify(global_data)


@app.route("/metrics")
def metrics():
    with data_lock:
        zone_payload = build_zone_payload(global_data["zones"])
        return jsonify({
            "totalCount": global_data["count"],
            "density": global_data["density"],
            "overallStatus": global_data["status"].upper(),
            "zones": zone_payload,
            "source": global_data.get("source", "video"),
            "sourceLabel": global_data.get("source_label", "Video File"),
            "sourceName": global_data.get("source_name", "cctv.mp4"),
            "cameraMode": global_data.get("camera_mode", "video"),
            "anomalyScore": global_data.get("anomalyScore", 0)
        })


@app.route("/alerts")
def alerts():
    with data_lock:
        return jsonify(global_data["alerts"])


@app.route("/video_meta")
def video_meta():
    with data_lock:
        return jsonify({
            "streamUrl": "http://localhost:5000/video_feed",
            "source": global_data.get("source", "video"),
            "sourceLabel": global_data.get("source_label", "Video File"),
            "cameraMode": global_data.get("camera_mode", "video")
        })


@app.route("/heatmap")
def heatmap():
    with frame_lock:
        if latest_heatmap_jpeg is None:
            return jsonify({"error": "No heatmap available"}), 500
        heatmap_bytes = latest_heatmap_jpeg

    return Response(
        heatmap_bytes,
        mimetype="image/jpeg",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.route("/security/alerts")
def security_alerts():

    with data_lock:
        backend_alerts = global_data["alerts"]

    zone_assignment = {
        "Zone A": "SC-001",
        "Zone B": "SC-002",
        "Zone C": "SC-003",
        "Zone D": "SC-004",
        "Zone E": "SC-005",
        "Zone F": "SC-006",
        "Zone G": "SC-007",
        "Zone H": "SC-008",
        "Zone I": "SC-001",
    }

    security_alerts = []

    for alert in backend_alerts:

        title = alert.get("title", "")

        zone = "Unknown"

        if title.startswith("Zone"):
            parts = title.split()
            if len(parts) >= 2:
                zone = f"{parts[0]} {parts[1]}"

        severity = alert["severity"].lower()

        if severity == "high":
            alert_type = "Crowd Surge"
        elif severity == "moderate":
            alert_type = "Crowd Build-up"
        else:
            alert_type = "System Update"

        security_alerts.append({

            "id": alert["id"],

            "zone": zone,

            "severity": severity,

            "type": alert_type,

            "density": "--",

            "assigned": zone_assignment.get(zone, "SC-001"),

            "time": alert["timestamp"],

            "desc": title

        })

    return jsonify(security_alerts)


@app.route("/security/zones")
def security_zones():

    with data_lock:
        zone_counts = global_data["zones"]

    capacities = get_zone_capacity_map()

    officer_map = {
        "Zone A": 2,
        "Zone B": 2,
        "Zone C": 1,
        "Zone D": 1,
        "Zone E": 1,
        "Zone F": 1,
        "Zone G": 1,
        "Zone H": 1,
        "Zone I": 1,
    }

    zones = []

    for zone_name in ["A","B","C","D","E","F","G","H","I"]:

        current = int(zone_counts.get(zone_name, 0))
        capacity = int(capacities.get(zone_name, 5))

        density = int((current / capacity) * 100) if capacity > 0 else 0

        if density >= 80:
            status = "critical"
        elif density >= 50:
            status = "medium"
        else:
            status = "low"

        zones.append({
            "zone": f"Zone {zone_name}",
            "capacity": capacity,
            "current": current,
            "density": density,
            "status": status,
            "officers": officer_map.get(f"Zone {zone_name}", 1)
        })

    return jsonify(zones)


@app.route("/security/dispatch")
def security_dispatch():

    with data_lock:
        alerts = global_data["alerts"]

    dispatch_log = []

    for alert in alerts:

        severity = alert["severity"].upper()

        if severity == "HIGH":
            target = "ALL"
            msg = f"{alert['title']} - Immediate response required."
            msg_type = "broadcast"

        elif severity == "MODERATE":
            target = "Nearest Unit"
            msg = f"{alert['title']} - Monitor the situation."
            msg_type = "order"

        else:
            target = "Control"
            msg = alert["title"]
            msg_type = "field"

        dispatch_log.append({
            "time": alert["timestamp"],
            "from": "Control",
            "to": target,
            "msg": msg,
            "type": msg_type
        })

    return jsonify(dispatch_log)

@app.route("/incidents")
def incidents_api():

    with data_lock:
        alerts = global_data["alerts"]

    incidents = []

    for i, alert in enumerate(alerts):

        severity = alert["severity"].lower()

        if severity == "high":
            severity = "critical"
        elif severity == "moderate":
            severity = "medium"

        incidents.append({

            "id": f"INC-2026-{1000+i}",

            "date": "2026-08-06",

            "time": alert["timestamp"],

            # Extract zone from title
            "zone": alert["title"].split()[1]
                    if alert["title"].startswith("Zone")
                    else "Unknown",

            "type": alert["title"],

            "severity": severity,

            "status": "active",

            "reportedBy": "AI System",

            "assignedTo": "Control Room",

            "density": "--",

            "casualties": 0,

            "evacuated": 0,

            "description": alert["title"],

            "timeline": [
                {
                    "time": alert["timestamp"],
                    "actor": "AI System",
                    "action": alert["title"],
                    "type": "auto"
                }
            ],

            "tags": [
                severity
            ]

        })

    return jsonify(incidents)



@app.route("/acknowledge_alert", methods=["POST"])
def acknowledge_alert():
    payload = request.get_json(silent=True) or {}
    alert_id = payload.get("id")
    if not alert_id:
        return jsonify({"success": False, "message": "Missing alert id"}), 400

    return jsonify({
        "success": True,
        "message": f"Alert {alert_id} acknowledged"
    })

security_team = [
    {
        "id": 1,
        "name": "John Carter",
        "badge": "ST-101",
        "role": "Supervisor",
        "zone": "Zone A",
        "status": "on-duty",
        "radio": "CH-01",
        "avatar": "",
        "alerts": 2,
        "lastSeen": "Just now"
    },
    {
        "id": 2,
        "name": "Sarah Wilson",
        "badge": "ST-102",
        "role": "Patrol Officer",
        "zone": "Zone C",
        "status": "responding",
        "radio": "CH-03",
        "avatar": "",
        "alerts": 1,
        "lastSeen": "30 sec ago"
    },
    {
        "id": 3,
        "name": "Michael Lee",
        "badge": "ST-103",
        "role": "Control Room",
        "zone": "HQ",
        "status": "responding",
        "radio": "CH-05",
        "avatar": "",
        "alerts": 0,
        "lastSeen": "1 min ago"
    },
    {
        "id": 4,
        "name": "Emily Davis",
        "badge": "ST-104",
        "role": "Patrol Officer",
        "zone": "Zone F",
        "status": "break",
        "radio": "CH-04",
        "avatar": "",
        "alerts": 0,
        "lastSeen": "5 min ago"
    }
]

@app.route("/security/team")
def security_team_api():
    return jsonify(security_team)

if __name__ == "__main__":
    init_video("video")
    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    detect_thread = threading.Thread(target=detection_loop, daemon=True)
    capture_thread.start()
    detect_thread.start()
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)