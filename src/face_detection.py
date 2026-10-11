import cv2

# -----------------------------
# Initialize Webcam
# -----------------------------
camera = cv2.VideoCapture(0)

if not camera.isOpened():
    print("Error: Cannot access webcam.")
    exit()

# -----------------------------
# Load Face Detection Model
# -----------------------------
face_detector = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

print("Press ESC to exit...")

# -----------------------------
# Start Camera
# -----------------------------
while True:

    ret, frame = camera.read()

    if not ret:
        print("Error: Cannot read frame.")
        break

    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Detect faces
    faces = face_detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80)
    )

    # Draw rectangle around each detected face
    for (x, y, w, h) in faces:

        cv2.rectangle(
            frame,
            (x, y),
            (x + w, y + h),
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            "Face Detected",
            (x, y - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

    # Display number of detected faces
    cv2.putText(
        frame,
        f"Faces Detected : {len(faces)}",
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 0, 0),
        2
    )

    # Show Webcam
    cv2.imshow("Face Detection", frame)

    # ESC key to exit
    if cv2.waitKey(1) & 0xFF == 27:
        break

# -----------------------------
# Release Resources
# -----------------------------
camera.release()
cv2.destroyAllWindows()