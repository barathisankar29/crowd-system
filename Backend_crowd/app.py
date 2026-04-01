from flask import Flask, Response, jsonify
import cv2
from main import detect_people, get_zone_counts
from threading import Lock

app = Flask(__name__)

data_lock = Lock()

global_data = {
    "count": 0,
    "density": 0,
    "status": "safe",
    "zones": {}   # 🔥 IMPORTANT
}

NORMALIZATION_FACTOR = 10000


def generate_frames():
    cap = cv2.VideoCapture("crowd.mp4")

    while True:
        success, frame = cap.read()

        if not success:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame = cv2.resize(frame, (640, 480))

        # 🔥 DETECTION
        detections = detect_people(frame)
        num_people = len(detections)

        # 🔥 ZONE COUNTS
        zone_counts = get_zone_counts(frame, detections)

        # 🔥 DRAW BOXES
        for (x1, y1, x2, y2) in detections:
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # 🔥 DRAW GRID (3x3)
        h, w, _ = frame.shape
        for i in range(1, 3):
            cv2.line(frame, (0, i * h // 3), (w, i * h // 3), (255, 255, 0), 2)
            cv2.line(frame, (i * w // 3, 0), (i * w // 3, h), (255, 255, 0), 2)

        # 🔥 DRAW ZONE LABELS
        zone_names = ['A','B','C','D','E','F','G','H','I']

        for idx, name in enumerate(zone_names):
            row = idx // 3
            col = idx % 3

            x = col * (w // 3) + 10
            y = row * (h // 3) + 30

            count = zone_counts[name]

            cv2.putText(frame, f'{name}: {count}', (x, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,255), 2)

        # 🔥 DENSITY
        frame_area = frame.shape[0] * frame.shape[1]
        density = (num_people / frame_area) * NORMALIZATION_FACTOR

        # 🔥 STATUS
        if num_people > 8:
            status = "high"
            color = (0, 0, 255)
        elif num_people > 4:
            status = "moderate"
            color = (0, 255, 255)
        else:
            status = "safe"
            color = (0, 255, 0)

        # 🔐 UPDATE GLOBAL DATA
        with data_lock:
            global_data["count"] = num_people
            global_data["density"] = round(density, 2)
            global_data["status"] = status
            global_data["zones"] = zone_counts   # 🔥 KEY FIX

        # 🔥 TEXT OVERLAY
        cv2.putText(frame, f'Count: {num_people}', (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        cv2.putText(frame, f'Density: {density:.2f}', (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        cv2.putText(frame, f'Status: {status}', (10, 110),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        # 🔥 STREAM FRAME
        _, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/status')
def status():
    with data_lock:
        return jsonify(global_data)


# 🔥 REAL HEATMAP
@app.route('/heatmap')
def heatmap():
    cap = cv2.VideoCapture("crowd.mp4")

    success, frame = cap.read()

    if not success:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        success, frame = cap.read()

    frame = cv2.resize(frame, (640, 480))

    detections = detect_people(frame)

    heatmap = frame.copy()

    for (x1, y1, x2, y2) in detections:
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2

        cv2.circle(heatmap, (cx, cy), 40, (0, 0, 255), -1)

    heatmap = cv2.GaussianBlur(heatmap, (51, 51), 0)

    _, buffer = cv2.imencode('.jpg', heatmap)

    return Response(buffer.tobytes(), mimetype='image/jpeg')


if __name__ == "__main__":
    app.run(debug=True)