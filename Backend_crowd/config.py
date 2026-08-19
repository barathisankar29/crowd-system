import os

from dotenv import load_dotenv

load_dotenv()


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


SOURCE_TYPE = os.environ.get("SOURCE_TYPE", "video")
VIDEO_FILE = os.environ.get("VIDEO_FILE", "cctv.mp4")
WEBCAM_INDEX = int(os.environ.get("WEBCAM_INDEX", "0"))
CAMERA_URL = os.environ.get("CAMERA_URL", "").strip()

BACKEND_PORT = int(os.environ.get("BACKEND_PORT", "5000"))
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

DB_URL = os.environ.get("DB_URL", "sqlite:///crowd_system.db")

ZONE_SCALE = _env_float("ZONE_SCALE", 1.0)

BASE_ZONE_CAPACITY = 5
ZONE_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"]


def build_source_config():
    """One configurable source map, replacing the old app.py / app_phone.py duplication."""
    sources = {
        "video": {
            "label": "Video File",
            "name": VIDEO_FILE,
            "type": "file",
            "value": VIDEO_FILE,
            "zone_scale": 1.0,
            "profile": "video",
        },
        "webcam": {
            "label": "Live Webcam",
            "name": f"Webcam {WEBCAM_INDEX}",
            "type": "camera",
            "value": WEBCAM_INDEX,
            "zone_scale": 0.7 * ZONE_SCALE,
            "profile": "webcam",
        },
    }

    if CAMERA_URL:
        sources["phone"] = {
            "label": "Phone CCTV",
            "name": "IP Webcam",
            "type": "camera",
            "value": CAMERA_URL,
            "zone_scale": 1.0 * ZONE_SCALE,
            "profile": "webcam",
        }

    return sources


SOURCE_CONFIG = build_source_config()
DEFAULT_SOURCE = SOURCE_TYPE if SOURCE_TYPE in SOURCE_CONFIG else "video"
