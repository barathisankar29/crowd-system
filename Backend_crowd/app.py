from flask import Flask
from flask_cors import CORS

import config
import pipeline
from db import init_db
from routes_dispatch import dispatch_bp
from routes_incidents import incidents_bp
from routes_permissions import permissions_bp
from routes_personnel import personnel_bp
from routes_vision import vision_bp
from routes_zones import zones_bp


def create_app():
    app = Flask(__name__)
    CORS(app, origins=[config.FRONTEND_URL])

    app.register_blueprint(vision_bp)
    app.register_blueprint(personnel_bp)
    app.register_blueprint(incidents_bp)
    app.register_blueprint(dispatch_bp)
    app.register_blueprint(zones_bp)
    app.register_blueprint(permissions_bp)

    return app


app = create_app()

if __name__ == "__main__":
    init_db()
    pipeline.start_background_threads()
    app.run(host="0.0.0.0", port=config.BACKEND_PORT, debug=False, threaded=True)
