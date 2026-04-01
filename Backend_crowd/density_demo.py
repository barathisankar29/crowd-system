# density_demo.py
import cv2
from main import detect_people  # Our function from main.py

# --------- Adjustable Parameters ---------
THRESHOLD = 5        # Number of people considered as "Crowded"
NORMALIZATION_FACTOR = 10000
# ----------------------------------------

# Initialize webcam
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break

    # Resize frame to 640x480 for consistent detection
    frame = cv2.resize(frame, (640, 480))

    # ----- Detection -----
    detections = detect_people(frame)
    num_people = len(detections)

    # Draw bounding boxes
    for (x1, y1, x2, y2) in detections:
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    # ----- Density Calculation -----
    frame_area = frame.shape[0] * frame.shape[1]
    raw_density = num_people / frame_area
    density = raw_density * NORMALIZATION_FACTOR

    # ----- Status based on threshold -----
    if num_people >= THRESHOLD:
        status = "Crowded"
        color = (0, 0, 255)  # Red
    else:
        status = "Safe"
        color = (0, 255, 0)  # Green

    # ----- Overlay on frame -----
    cv2.putText(frame, f'Count: {num_people}', (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    cv2.putText(frame, f'Density: {density:.2f}', (10, 70),
                cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    cv2.putText(frame, f'Status: {status}', (10, 110),
                cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

    # ----- Display frame -----
    cv2.imshow("Webcam Crowd Density", frame)

    # ----- Controls -----
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):  # Quit
        break

# Release resources
cap.release()
cv2.destroyAllWindows()