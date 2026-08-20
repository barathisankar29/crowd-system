import logging
import threading
import time
from datetime import datetime, timezone

import cv2
import numpy as np

import config
import services_incidents
from db import get_session
from models import MetricSnapshot
from vision import detect_people, get_zone_counts

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("crowd_pipeline")

data_lock = threading.Lock()
frame_lock = threading.Lock()
source_lock = threading.Lock()

# Real start/stop: capture keeps running (cheap) but YOLO inference is
# skipped entirely while this is cleared, instead of always running
# regardless of what the "Start/Stop Monitoring" button in the UI says.
monitoring_enabled = threading.Event()

NORMALIZATION_FACTOR = 10000
PREDICT_SECONDS = 30
SNAPSHOT_INTERVAL = 2.0
INFER_INTERVAL = 0.12

global_data = {
    "count": 0,
    "density": 0,
    "status": "safe",
    "zones": {},
    "anomalyScore": 0,
    "monitoring": False,
    "source": config.DEFAULT_SOURCE,
    "source_label": "",
    "source_name": "",
    "camera_mode": "",
    "prediction": None,
    "camera_connected": True,
    "started_at": None,
    "last_error": None,
    "last_frame_at": None,
}

current_source_key = config.DEFAULT_SOURCE
cap = None
source_fps = 25.0

latest_raw_frame = None
latest_stream_jpeg = None
latest_heatmap_jpeg = None
latest_detections = []
latest_zone_counts = {k: 0 for k in config.ZONE_NAMES}

running_capture = True
_paused_jpeg = None


def _safe_source_value(source_key: str) -> str:
    """The active source's connection value, with any embedded basic-auth
    credentials (IP Webcam supports http://user:pass@host/video URLs) masked
    out — this is what gets logged and exposed via /status, never the raw
    value if it could contain a credential."""
    cfg = config.SOURCE_CONFIG.get(source_key)
    if cfg is None:
        return "?"
    value = cfg.get("value")
    if isinstance(value, str) and "@" in value and "://" in value:
        scheme, _, rest = value.partition("://")
        _, _, host_and_path = rest.partition("@")
        return f"{scheme}://{host_and_path}"
    return str(value)


def open_capture_for_source(source_key: str):
    cfg = config.SOURCE_CONFIG[source_key]
    safe_value = _safe_source_value(source_key)
    logger.info("Opening capture: source=%s value=%s", source_key, safe_value)
    capture = cv2.VideoCapture(cfg["value"])
    if not capture.isOpened():
        capture.release()
        logger.warning("Capture did not open: source=%s value=%s", source_key, safe_value)
        return None, 25.0
    fps = capture.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 1:
        fps = 25.0
    logger.info("Capture opened: source=%s value=%s fps=%.1f", source_key, safe_value, fps)
    return capture, fps


def close_capture():
    global cap
    if cap is not None:
        try:
            cap.release()
        except Exception:
            pass
        cap = None


def _apply_source(source_key, cfg):
    global_data["source"] = source_key
    global_data["source_label"] = cfg["label"]
    global_data["source_name"] = cfg["name"]
    global_data["camera_mode"] = cfg["type"]


def init_video(source_key: str | None = None):
    """Sets the intended source's metadata immediately (no I/O). The actual
    cv2.VideoCapture open happens lazily in capture_frames()'s own reconnect
    loop, so a slow or unreachable camera (e.g. a phone that isn't on the
    network yet) never blocks Flask from starting to serve the rest of the
    API — see the "cap is None" branch below."""
    global current_source_key
    source_key = source_key or config.DEFAULT_SOURCE

    with source_lock:
        close_capture()
        current_source_key = source_key

    with data_lock:
        _apply_source(source_key, config.SOURCE_CONFIG[source_key])
        global_data["camera_connected"] = False


def switch_source(source_key: str):
    global latest_raw_frame, latest_stream_jpeg, latest_heatmap_jpeg, latest_detections, latest_zone_counts
    global current_source_key

    if source_key not in config.SOURCE_CONFIG:
        return False, f"Invalid source '{source_key}'"

    logger.info("Switching source to %s (%s)", source_key, _safe_source_value(source_key))

    with source_lock:
        close_capture()
        current_source_key = source_key
        latest_raw_frame = None
        latest_stream_jpeg = None
        latest_heatmap_jpeg = None
        latest_detections = []
        latest_zone_counts = {k: 0 for k in config.ZONE_NAMES}

    with data_lock:
        _apply_source(source_key, config.SOURCE_CONFIG[source_key])
        global_data["count"] = 0
        global_data["density"] = 0
        global_data["status"] = "safe"
        global_data["zones"] = {}
        global_data["anomalyScore"] = 0
        global_data["camera_connected"] = False
        global_data["last_error"] = None
        global_data["last_frame_at"] = None

    # The actual reconnect happens in capture_frames()'s "cap is None" branch
    # (same path used above) — switching to a slow/unreachable source never
    # blocks this request. /status.cameraConnected reflects the real outcome
    # shortly after.
    return True, f"Switched to {config.SOURCE_CONFIG[source_key]['label']}"


def get_zone_capacity_map():
    cfg = config.SOURCE_CONFIG.get(current_source_key, config.SOURCE_CONFIG[config.DEFAULT_SOURCE])
    scale = cfg.get("zone_scale", 1.0)
    return {k: max(1, int(config.BASE_ZONE_CAPACITY * scale)) for k in config.ZONE_NAMES}


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
    for zone_name in config.ZONE_NAMES:
        count = int(zone_counts.get(zone_name, 0))
        capacity = int(capacities.get(zone_name, config.BASE_ZONE_CAPACITY))
        status, message = get_zone_status(count, capacity)
        zones.append({
            "id": f"zone-{zone_name.lower()}",
            "name": f"Zone {zone_name}",
            "count": count,
            "capacity": capacity,
            "status": status,
            "message": message,
        })
    return zones


def draw_grid(frame):
    h, w, _ = frame.shape
    for i in range(1, 3):
        cv2.line(frame, (0, i * h // 3), (w, i * h // 3), (255, 255, 0), 2)
        cv2.line(frame, (i * w // 3, 0), (i * w // 3, h), (255, 255, 0), 2)


def draw_zone_counts(frame, zone_counts):
    h, w, _ = frame.shape
    for idx, name in enumerate(config.ZONE_NAMES):
        row, col = idx // 3, idx % 3
        x, y = col * (w // 3) + 12, row * (h // 3) + 34
        count = zone_counts.get(name, 0)
        cv2.putText(frame, f"{name}: {count}", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)


def encode_jpg(frame, quality=78):
    ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    return buffer.tobytes() if ok else None


def compute_anomaly_score(num_people, zone_counts):
    capacities = get_zone_capacity_map()
    zone_values = [
        (int(zone_counts.get(z, 0)) / capacities.get(z, config.BASE_ZONE_CAPACITY))
        for z in config.ZONE_NAMES
    ]
    avg_fill = sum(zone_values) / len(zone_values) if zone_values else 0
    peak_fill = max(zone_values) if zone_values else 0
    crowd_factor = min(1.0, num_people / 12.0)
    imbalance = max(0.0, peak_fill - avg_fill)
    score = (0.45 * crowd_factor) + (0.35 * peak_fill) + (0.20 * imbalance)
    return max(0.0, min(1.0, score))


def _paused_frame_jpeg():
    global _paused_jpeg
    if _paused_jpeg is not None:
        return _paused_jpeg
    frame = np.zeros((360, 640, 3), dtype="uint8")
    cv2.putText(frame, "Monitoring paused", (140, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (140, 140, 140), 2)
    cv2.putText(frame, "Start monitoring to resume detection", (90, 205), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (90, 90, 90), 1)
    _paused_jpeg = encode_jpg(frame, quality=70)
    return _paused_jpeg


DISCONNECT_THRESHOLD = 1.5  # seconds of continuous read failure before flagging camera_connected=False
RECONNECT_INTERVAL = 2.0  # seconds between reopen attempts while disconnected


_reconnecting_sources: set[str] = set()
_reconnecting_lock = threading.Lock()


def _do_reconnect(source_key, expected_cap):
    global cap, source_fps
    try:
        new_cap, fps = open_capture_for_source(source_key)
        if new_cap is None:
            with data_lock:
                if current_source_key == source_key:
                    global_data["last_error"] = f"Unable to open '{source_key}' ({_safe_source_value(source_key)})"
            return
        with source_lock:
            if current_source_key == source_key and cap is expected_cap:
                close_capture()
                cap = new_cap
                source_fps = fps
            else:
                # Source moved on (switched again, or another attempt for the
                # same source already succeeded) while this one was in flight.
                logger.info("Discarding stale reconnect for source=%s (source changed during connect)", source_key)
                new_cap.release()
    finally:
        with _reconnecting_lock:
            _reconnecting_sources.discard(source_key)


def _attempt_reconnect(source_key, expected_cap):
    """Kicks off a capture-open attempt on its own thread. cv2.VideoCapture
    has no connect timeout and can block for a minute or more against an
    unreachable host — running it inline in capture_frames()'s loop would
    freeze frame capture for *every* source, including one the user has
    already switched to. At most one attempt runs per source at a time; a
    stale attempt for an old source is discarded by _do_reconnect's own
    check once it eventually finishes."""
    with _reconnecting_lock:
        if source_key in _reconnecting_sources:
            return
        _reconnecting_sources.add(source_key)
    threading.Thread(target=_do_reconnect, args=(source_key, expected_cap), daemon=True).start()


def capture_frames():
    global latest_raw_frame, running_capture

    first_failure_time = None
    last_reconnect_attempt = 0.0

    while running_capture:
        with source_lock:
            local_cap, local_key = cap, current_source_key

        if local_cap is None:
            # Never opened yet (fresh start / just switched) — same
            # flag-then-retry treatment as a mid-session disconnect, so a
            # camera that isn't reachable at startup never blocks anything
            # else and keeps trying on its own.
            now = time.time()
            if first_failure_time is None:
                first_failure_time = now
            if now - first_failure_time >= DISCONNECT_THRESHOLD:
                with data_lock:
                    if global_data["camera_connected"]:
                        logger.warning(
                            "Camera not connected: source=%s value=%s",
                            local_key, _safe_source_value(local_key),
                        )
                    global_data["camera_connected"] = False
                    if global_data["last_error"] is None:
                        global_data["last_error"] = (
                            f"Connecting to '{local_key}' ({_safe_source_value(local_key)})..."
                        )
            if now - last_reconnect_attempt >= RECONNECT_INTERVAL:
                last_reconnect_attempt = now
                _attempt_reconnect(local_key, None)
            time.sleep(0.05)
            continue

        success, frame = local_cap.read()

        if not success:
            now = time.time()
            if first_failure_time is None:
                first_failure_time = now

            if local_key == "video":
                # Sample video loops back to the start instead of "reconnecting".
                with source_lock:
                    if cap is local_cap:
                        local_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                time.sleep(0.02)
                continue

            # Camera-type source (webcam/phone): flag it, then retry the
            # connection periodically instead of spinning on a dead handle.
            if now - first_failure_time >= DISCONNECT_THRESHOLD:
                with data_lock:
                    if global_data["camera_connected"]:
                        logger.warning(
                            "Camera stopped returning frames: source=%s value=%s",
                            local_key, _safe_source_value(local_key),
                        )
                        global_data["last_error"] = (
                            f"Lost connection to '{local_key}' ({_safe_source_value(local_key)})"
                        )
                    global_data["camera_connected"] = False

                if now - last_reconnect_attempt >= RECONNECT_INTERVAL:
                    last_reconnect_attempt = now
                    _attempt_reconnect(local_key, local_cap)

            time.sleep(0.02)
            continue

        first_failure_time = None
        with data_lock:
            if not global_data["camera_connected"]:
                logger.info("Camera connected: source=%s value=%s", local_key, _safe_source_value(local_key))
                global_data["camera_connected"] = True
            global_data["last_error"] = None
            global_data["last_frame_at"] = datetime.now(timezone.utc)

        frame = cv2.resize(frame, (640, 360))
        with frame_lock:
            latest_raw_frame = frame.copy()

        time.sleep(1.0 / max(source_fps, 25.0))


def _record_snapshot(count, density):
    with get_session() as session:
        session.add(MetricSnapshot(count=count, density=density, zones_json="{}"))
        cutoff_count = session.query(MetricSnapshot).count()
        if cutoff_count > 3600:  # ~2h at one snapshot/2s
            stale = (
                session.query(MetricSnapshot)
                .order_by(MetricSnapshot.ts.asc())
                .limit(cutoff_count - 3600)
                .all()
            )
            for row in stale:
                session.delete(row)


def _predict():
    with get_session() as session:
        rows = (
            session.query(MetricSnapshot)
            .order_by(MetricSnapshot.ts.desc())
            .limit(8)
            .all()
        )
    if len(rows) < 2:
        return None

    rows = list(reversed(rows))
    t1, c1, d1 = rows[0].ts.timestamp(), rows[0].count, rows[0].density
    t2, c2, d2 = rows[-1].ts.timestamp(), rows[-1].count, rows[-1].density
    if t2 - t1 <= 0:
        return None

    count_rate = (c2 - c1) / (t2 - t1)
    density_rate = (d2 - d1) / (t2 - t1)
    predicted_count = max(0, round(c2 + count_rate * PREDICT_SECONDS))
    predicted_density = max(0.0, round(d2 + density_rate * PREDICT_SECONDS, 2))

    if predicted_count > 8:
        risk_level = "high"
    elif predicted_count > 4:
        risk_level = "moderate"
    else:
        risk_level = "safe"

    return {
        "predictedCount": predicted_count,
        "predictedDensity": predicted_density,
        "horizonSeconds": PREDICT_SECONDS,
        "riskLevel": risk_level,
        # Deliberately explicit: this is a simple trend extrapolation over the
        # last ~16s of snapshots, not a calibrated crowd-forecasting model.
        "method": "linear-trend-30s",
    }


def detection_loop():
    global latest_stream_jpeg, latest_heatmap_jpeg, latest_detections, latest_zone_counts

    last_infer_time = 0
    last_snapshot_time = 0

    while running_capture:
        now = time.time()

        if not monitoring_enabled.is_set():
            with frame_lock:
                latest_stream_jpeg = _paused_frame_jpeg()
            with data_lock:
                global_data["monitoring"] = False
            time.sleep(0.1)
            continue

        if now - last_infer_time < INFER_INTERVAL:
            time.sleep(0.01)
            continue

        with frame_lock:
            if latest_raw_frame is None:
                time.sleep(0.01)
                continue
            frame = latest_raw_frame.copy()

        source_profile = config.SOURCE_CONFIG.get(current_source_key, {}).get("profile", "video")
        detections = detect_people(frame, source_key=source_profile)
        num_people = len(detections)
        zone_counts = get_zone_counts(frame, detections, source_key=source_profile)

        annotated = frame.copy()
        for (x1, y1, x2, y2) in detections:
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
        draw_grid(annotated)
        draw_zone_counts(annotated, zone_counts)

        frame_area = annotated.shape[0] * annotated.shape[1]
        density = (num_people / frame_area) * NORMALIZATION_FACTOR

        if num_people > 8:
            status, color = "high", (0, 0, 255)
        elif num_people > 4:
            status, color = "moderate", (0, 255, 255)
        else:
            status, color = "safe", (0, 255, 0)

        anomaly_score = compute_anomaly_score(num_people, zone_counts)

        cv2.putText(annotated, f"Count: {num_people}", (10, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(annotated, f"Density Index: {density:.2f}", (10, 68), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(annotated, f"Status: {status}", (10, 104), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(annotated, f"Anomaly: {anomaly_score:.2f}", (10, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 165, 0), 2)

        heatmap_img = frame.copy()
        for (x1, y1, x2, y2) in detections:
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            cv2.circle(heatmap_img, (cx, cy), 28, (0, 0, 255), -1)
        heatmap_img = cv2.GaussianBlur(heatmap_img, (41, 41), 0)

        capacities = get_zone_capacity_map()
        services_incidents.sync_from_detection(zone_counts, capacities, density, anomaly_score)

        stream_jpeg = encode_jpg(annotated, quality=78)
        heatmap_jpeg = encode_jpg(heatmap_img, quality=76)

        with frame_lock:
            latest_stream_jpeg = stream_jpeg
            latest_heatmap_jpeg = heatmap_jpeg
            latest_detections = detections
            latest_zone_counts = zone_counts

        prediction = None
        if now - last_snapshot_time >= SNAPSHOT_INTERVAL:
            _record_snapshot(num_people, round(density, 2))
            last_snapshot_time = now
        prediction = _predict()

        with data_lock:
            global_data["count"] = num_people
            global_data["density"] = round(density, 2)
            global_data["status"] = status
            global_data["zones"] = zone_counts
            global_data["anomalyScore"] = round(anomaly_score, 2)
            global_data["monitoring"] = True
            global_data["prediction"] = prediction

        last_infer_time = now


def start_monitoring():
    with data_lock:
        if not monitoring_enabled.is_set():
            global_data["started_at"] = datetime.now(timezone.utc)
        monitoring_enabled.set()
        # Reflects intent (start was called), independent of whether frames
        # are actually flowing yet — detection_loop() previously only set
        # this after a successful frame, which meant an unreachable camera
        # made "running" falsely report false even though monitoring_enabled
        # was genuinely set. camera_connected is the separate, correct signal
        # for feed health.
        global_data["monitoring"] = True


def stop_monitoring():
    monitoring_enabled.clear()
    with data_lock:
        global_data["monitoring"] = False
        global_data["started_at"] = None


def start_background_threads():
    init_video(config.DEFAULT_SOURCE)
    threading.Thread(target=capture_frames, daemon=True).start()
    threading.Thread(target=detection_loop, daemon=True).start()
