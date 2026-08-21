"""
Compatibility entry point for the phone-camera source. Equivalent to setting
SOURCE_TYPE=phone in .env and running `python app.py`, kept as an explicit,
discoverable launch path. Uses the same shared Flask app/pipeline as app.py —
no capture/detection/zone/alert logic is duplicated here.
"""
import os

from dotenv import load_dotenv

load_dotenv()  # picks up Backend_crowd/.env, same as config.py

if not os.environ.get("CAMERA_URL", "").strip():
    raise SystemExit(
        "CAMERA_URL is not set. Add CAMERA_URL= http://172.16.211.1:8080/video"
        "to Backend_crowd/.env before running app_phone.py."
    )
os.environ["SOURCE_TYPE"] = "phone"  # dotenv won't override this later

from app import app
import config
import pipeline
from db import init_db

if __name__ == "__main__":
    init_db()
    pipeline.start_background_threads()
    app.run(host="0.0.0.0", port=config.BACKEND_PORT, debug=False, threaded=True)
