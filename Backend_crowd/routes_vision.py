import queue
import threading
import time
from datetime import datetime, timezone

import cv2
from flask import Blueprint, Response, jsonify, request

import config
import pipeline
import services_incidents
from auth import require_permission

vision_bp = Blueprint("vision", __name__)


def _generate_frames():
    while True:
        with pipeline.frame_lock:
            frame_bytes = pipeline.latest_stream_jpeg
        if frame_bytes is None:
            time.sleep(0.01)
            continue
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        time.sleep(0.01)


@vision_bp.route("/video_feed")
def video_feed():
    return Response(
        _generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache"},
    )


@vision_bp.route("/heatmap")
def heatmap():
    with pipeline.frame_lock:
        heatmap_bytes = pipeline.latest_heatmap_jpeg
    if heatmap_bytes is None:
        return jsonify({"error": "No heatmap available"}), 503
    return Response(
        heatmap_bytes, mimetype="image/jpeg",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache"},
    )


@vision_bp.route("/metrics")
def metrics():
    with pipeline.data_lock:
        data = dict(pipeline.global_data)
        zones = data.get("zones", {})

    return jsonify({
        "totalCount": data["count"],
        "density": data["density"],
        "overallStatus": data["status"].upper(),
        "zones": pipeline.build_zone_payload(zones),
        "source": data.get("source"),
        "sourceLabel": data.get("source_label"),
        "sourceName": data.get("source_name"),
        "cameraMode": data.get("camera_mode"),
        "anomalyScore": data.get("anomalyScore", 0),
        "monitoring": data.get("monitoring", False),
        "prediction": data.get("prediction"),
    })


@vision_bp.route("/alerts")
def alerts():
    return jsonify(services_incidents.recent_alerts())


@vision_bp.route("/status")
def status():
    with pipeline.data_lock:
        data = dict(pipeline.global_data)

    started_at = data.get("started_at")
    uptime_seconds = None
    if started_at is not None:
        uptime_seconds = round((datetime.now(timezone.utc) - started_at).total_seconds(), 1)

    last_frame_at = data.get("last_frame_at")

    return jsonify({
        "running": data.get("monitoring", False),
        "source": data.get("source"),
        "sourceLabel": data.get("source_label"),
        "sourceName": data.get("source_name"),
        "cameraMode": data.get("camera_mode"),
        "cameraConnected": data.get("camera_connected", True),
        "cameraUrl": pipeline._safe_source_value(data.get("source")),
        "lastError": data.get("last_error"),
        "lastFrameAt": last_frame_at.isoformat() if last_frame_at is not None else None,
        "startedAt": started_at.isoformat() if started_at is not None else None,
        "uptimeSeconds": uptime_seconds,
        "totalCount": data.get("count", 0),
        "density": data.get("density", 0),
        "overallStatus": str(data.get("status", "safe")).upper(),
        "anomalyScore": data.get("anomalyScore", 0),
        "prediction": data.get("prediction"),
    })


@vision_bp.route("/video_meta")
def video_meta():
    with pipeline.data_lock:
        data = dict(pipeline.global_data)
    return jsonify({
        "streamUrl": f"http://localhost:{config.BACKEND_PORT}/video_feed",
        "source": data.get("source"),
        "sourceLabel": data.get("source_label"),
        "cameraMode": data.get("camera_mode"),
    })


@vision_bp.route("/sources")
def sources():
    return jsonify([
        {"id": key, "label": cfg["label"], "name": cfg["name"], "type": cfg["type"], "zoneScale": cfg["zone_scale"]}
        for key, cfg in config.SOURCE_CONFIG.items()
    ])


@vision_bp.route("/switch_source", methods=["POST"])
@require_permission("manage_system_settings")
def api_switch_source():
    payload = request.get_json(silent=True) or {}
    source_key = payload.get("source", config.DEFAULT_SOURCE)
    ok, message = pipeline.switch_source(source_key)
    return jsonify({"success": ok, "message": message}), (200 if ok else 400)


CAMERA_TEST_TIMEOUT = 6.0


def _probe_camera(url: str, result_queue: "queue.Queue[dict]") -> None:
    capture = None
    try:
        capture = cv2.VideoCapture(url)
        if not capture.isOpened():
            result_queue.put({"connected": False, "message": "Unable to open the stream."})
            return
        success, _ = capture.read()
        if not success:
            result_queue.put({"connected": False, "message": "Stream opened but returned no frame."})
            return
        result_queue.put({"connected": True, "message": "Connected."})
    except Exception as exc:  # noqa: BLE001 - this is a best-effort probe, never allowed to crash the caller
        result_queue.put({"connected": False, "message": f"Connection failed: {exc}"})
    finally:
        if capture is not None:
            capture.release()


@vision_bp.route("/api/camera/test", methods=["POST"])
@require_permission("manage_system_settings")
def test_camera():
    payload = request.get_json(silent=True) or {}
    url = (payload.get("url") or config.CAMERA_URL or "").strip()
    if not url:
        return jsonify({"connected": False, "message": "No camera URL provided or configured."}), 400

    # cv2.VideoCapture has no built-in connect timeout, and an unreachable
    # IP-camera host can block for a minute or more. Run the probe in its own
    # thread and bound how long this request waits for it — a hung probe is
    # left to finish (and release its own handle) in the background instead
    # of blocking the response.
    result_queue: "queue.Queue[dict]" = queue.Queue(maxsize=1)
    probe = threading.Thread(target=_probe_camera, args=(url, result_queue), daemon=True)
    probe.start()
    probe.join(timeout=CAMERA_TEST_TIMEOUT)

    if probe.is_alive():
        return jsonify({"connected": False, "message": "Connection timed out."})

    try:
        return jsonify(result_queue.get_nowait())
    except queue.Empty:
        return jsonify({"connected": False, "message": "Connection attempt failed unexpectedly."})


@vision_bp.route("/api/monitoring/start", methods=["POST"])
@require_permission("manage_system_settings")
def start_monitoring():
    pipeline.start_monitoring()
    return jsonify({"success": True, "monitoring": True})


@vision_bp.route("/api/monitoring/stop", methods=["POST"])
@require_permission("manage_system_settings")
def stop_monitoring():
    pipeline.stop_monitoring()
    return jsonify({"success": True, "monitoring": False})
