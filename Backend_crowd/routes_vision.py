import time

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
        return jsonify(dict(pipeline.global_data))


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
