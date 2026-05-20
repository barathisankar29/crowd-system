import cv2

url = "http://192.168.1.4:8080/video"

cap = cv2.VideoCapture(url)

while True:
    ret, frame = cap.read()

    if not ret:
        print("Failed to grab frame - test_cam.py:11")
        break

    cv2.imshow("Phone CCTV", frame)

    if cv2.waitKey(1) == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()