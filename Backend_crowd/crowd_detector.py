import cv2
from ultralytics import YOLO

# LOAD YOLO MODEL
model = YOLO("yolov8n.pt")

# PHONE CAMERA URL
url = "http://192.168.1.4:8080/video"

# CONNECT CAMERA
cap = cv2.VideoCapture(url)

# ZONE LABELS
zone_labels = [
    "A", "B", "C",
    "D", "E", "F",
    "G", "H", "I"
]


# FUNCTION TO DETECT ZONE
def get_zone(cx, cy, width, height):

    zone_w = width // 3
    zone_h = height // 3

    col = cx // zone_w
    row = cy // zone_h

    zone = row * 3 + col

    if zone > 8:
        zone = 8

    return zone


while True:

    success, frame = cap.read()

    if not success:
        print("Camera Not Working - crowd_detector.py:43")
        break

    # RESIZE FRAME
    frame = cv2.resize(frame, (960, 720))

    h, w, _ = frame.shape

    # DRAW GRID LINES
    cv2.line(frame, (w // 3, 0), (w // 3, h), (255, 255, 255), 2)
    cv2.line(frame, ((w // 3) * 2, 0), ((w // 3) * 2, h), (255, 255, 255), 2)

    cv2.line(frame, (0, h // 3), (w, h // 3), (255, 255, 255), 2)
    cv2.line(frame, (0, (h // 3) * 2), (w, (h // 3) * 2), (255, 255, 255), 2)

    # RESET ZONE COUNTS
    zone_counts = [0] * 9

    # RUN YOLO
    results = model(frame, verbose=False)

    total_people = 0

    for result in results:

        boxes = result.boxes

        for box in boxes:

            cls = int(box.cls[0])

            # PERSON CLASS = 0
            if cls == 0:

                total_people += 1

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # CENTER POINT
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2

                # DETECT ZONE
                zone = get_zone(cx, cy, w, h)

                zone_counts[zone] += 1

                # DRAW PERSON BOX
                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2
                )

                # DRAW CENTER DOT
                cv2.circle(
                    frame,
                    (cx, cy),
                    5,
                    (0, 0, 255),
                    -1
                )

                # LABEL ZONE
                cv2.putText(
                    frame,
                    f"Zone {zone_labels[zone]}",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 255),
                    2
                )

    # RISK LEVELS
    if total_people < 5:
        risk = "SAFE"

    elif total_people < 12:
        risk = "MODERATE"

    elif total_people < 20:
        risk = "HIGH"

    else:
        risk = "CRITICAL"

    # DISPLAY TOTAL PEOPLE
    cv2.putText(
        frame,
        f"People Count: {total_people}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 0, 255),
        3
    )

    # DISPLAY RISK LEVEL
    cv2.putText(
        frame,
        f"Risk Level: {risk}",
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 255),
        3
    )

    # DISPLAY ZONE COUNTS
    zone_index = 0

    for row in range(3):

        for col in range(3):

            x = col * (w // 3) + 20
            y = row * (h // 3) + 40

            cv2.putText(
                frame,
                f"Zone {zone_labels[zone_index]}: {zone_counts[zone_index]}",
                (x, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 0),
                2
            )

            zone_index += 1

    # SHOW OUTPUT
    cv2.imshow("AI Crowd Density Detection", frame)

    # PRESS Q TO EXIT
    if cv2.waitKey(1) == ord("q"):
        break

# RELEASE CAMERA
cap.release()
cv2.destroyAllWindows()