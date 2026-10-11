import cv2
import time
import pickle
import os
import numpy as np
from deepface import DeepFace

from anti_spoof import AntiSpoofingONNX
from attendance import mark_attendance

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
def verify_uploaded_face(image_bytes):
    """
    Verify a face from an uploaded image.

    Returns:
        {
            "success": True/False,
            "student_id": "...",
            "confidence": float,
            "distance": float,
            "message": "..."
        }
    """

    try:
        print("=" * 50)
        print("Uploaded Face Verification Started")
        print("=" * 50)

        # -----------------------------------------
        # 1. Load stored face embeddings
        # -----------------------------------------

        embeddings_path = os.path.join(
            BASE_DIR,
            "models",
            "face_embeddings.pkl"
        )

        if not os.path.exists(embeddings_path):
            return {
                "success": False,
                "message": "Face embeddings file not found"
            }

        with open(embeddings_path, "rb") as file:
            embeddings = pickle.load(file)

        print(f"{len(embeddings)} Face Embeddings Loaded Successfully")

        # -----------------------------------------
        # 2. Convert uploaded bytes to OpenCV image
        # -----------------------------------------

        image_array = np.frombuffer(image_bytes, np.uint8)

        frame = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if frame is None:
            return {
                "success": False,
                "message": "Unable to decode uploaded image"
            }

        # -----------------------------------------
        # 3. Detect face
        # -----------------------------------------

        face_detector = cv2.CascadeClassifier(
            cv2.data.haarcascades +
            "haarcascade_frontalface_default.xml"
        )

        gray = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2GRAY
        )

        faces = face_detector.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(50, 50)
        )

        print(f"Faces detected: {len(faces)}")

        if len(faces) == 0:
            return {
                "success": False,
                "message": "No face detected"
            }

        # For verification, require exactly one face
        if len(faces) > 1:
            return {
                "success": False,
                "message": "Multiple faces detected. Please show only one face."
            }

        # -----------------------------------------
        # 4. Get face bounding box
        # -----------------------------------------

        x, y, w, h = faces[0]

        face = frame[y:y+h, x:x+w]

        if face.size == 0:
            return {
                "success": False,
                "message": "Invalid face region"
            }

        # -----------------------------------------
        # 5. Anti-spoofing
        # -----------------------------------------

        anti_spoof_path = os.path.join(
            BASE_DIR,
            "models",
            "anti_spoof",
            "MiniFASNetV2.onnx"
        )

        if not os.path.exists(anti_spoof_path):
            return {
                "success": False,
                "message": "Anti-spoofing model not found"
            }

        anti_spoof = AntiSpoofingONNX(
            anti_spoof_path
        )

        bbox = [
            x,
            y,
            x + w,
            y + h
        ]

        spoof_result = anti_spoof.predict(
            frame,
            bbox
        )

        print("Anti-spoof result:", spoof_result)

        if spoof_result["label"] == "Fake":
            return {
                "success": False,
                "face_verified": False,
                "message": "Fake face detected"
            }

        # -----------------------------------------
        # 6. Prepare face for DeepFace
        # -----------------------------------------

        resized_face = cv2.resize(
            face,
            (160, 160)
        )

        rgb_face = cv2.cvtColor(
            resized_face,
            cv2.COLOR_BGR2RGB
        )

        # -----------------------------------------
        # 7. Generate FaceNet512 embedding
        # -----------------------------------------

        result = DeepFace.represent(
            img_path=rgb_face,
            model_name="Facenet512",
            detector_backend="skip",
            enforce_detection=False
        )

        current_embedding = np.array(
            result[0]["embedding"]
        )

        # -----------------------------------------
        # 8. Compare with stored embeddings
        # -----------------------------------------

        def cosine_distance(a, b):
            a = np.array(a)
            b = np.array(b)

            return 1 - (
                np.dot(a, b) /
                (
                    np.linalg.norm(a) *
                    np.linalg.norm(b)
                )
            )

        best_student = None
        best_distance = float("inf")

        for data in embeddings:

            db_embedding = np.array(
                data["embedding"]
            )

            distance = cosine_distance(
                current_embedding,
                db_embedding
            )

            if distance < best_distance:
                best_distance = distance
                best_student = data["student_id"]

        # -----------------------------------------
        # 9. Apply recognition threshold
        # -----------------------------------------

        THRESHOLD = 0.35

        print("Best student:", best_student)
        print("Best distance:", best_distance)

        if best_distance >= THRESHOLD:

            return {
                "success": False,
                "face_verified": False,
                "distance": float(best_distance),
                "message": "Face not recognized"
            }

        # -----------------------------------------
        # 10. Calculate confidence
        # -----------------------------------------

        confidence = (1 - best_distance) * 100

        print("Recognized Student:", best_student)
        print("Confidence:", confidence)
        print("Distance:", best_distance)

        return {
            "success": True,
            "face_verified": True,
            "student_id": str(best_student),
            "confidence": round(float(confidence), 2),
            "distance": round(float(best_distance), 4),
            "message": "Face recognized successfully"
        }

    except Exception as e:

        print("Uploaded Face Verification Error:")
        traceback.print_exc()

        return {
            "success": False,
            "face_verified": False,
            "message": str(e)
        }
def start_recognition():
    print("start_recognition() called")
    print("=" * 50)
    print("Loading Face Recognition Model...")
    print("=" * 50)

    embeddings_path = os.path.join(BASE_DIR, "models", "face_embeddings.pkl")
    if not os.path.exists(embeddings_path):
        embeddings_path = "models/face_embeddings.pkl"

    with open(embeddings_path, "rb") as file:
        embeddings = pickle.load(file)

    print(f"{len(embeddings)} Face Embeddings Loaded Successfully")
    
    face_detector = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    anti_spoof_path = os.path.join(BASE_DIR, "models", "anti_spoof", "MiniFASNetV2.onnx")
    if not os.path.exists(anti_spoof_path):
        anti_spoof_path = "models/anti_spoof/MiniFASNetV2.onnx"

    anti_spoof = AntiSpoofingONNX(anti_spoof_path)
    camera = cv2.VideoCapture(0)
    print("Creating camera...")
    print("Camera Opened:", camera.isOpened())

    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not camera.isOpened():
        print("Cannot Open Webcam")
        return

    print("Webcam Started Successfully")
    marked_students = set()
    
    # Track current active user status persistent across frames
    current_student = None
    current_confidence = 0.0
    last_seen_time = 0
    display_duration = 5.0  # seconds to keep displaying ID after face disappears/loses lock

    candidate_student = None
    stable_count = 0
    required_matches = 3  # Lowered slightly for faster lock-on

    frame_count = 0
    recognition_interval = 2
    THRESHOLD = 0.35

    def cosine_distance(a, b):
        a = np.array(a)
        b = np.array(b)
        return 1 - (np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    def recognize_face(face_image):
        try:
            rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
            result = DeepFace.represent(
                img_path=rgb,
                model_name="Facenet512",
                detector_backend="skip",
                enforce_detection=False
            )

            current_embedding = np.array(result[0]["embedding"])
            best_student = None
            best_distance = float("inf")

            for data in embeddings:
                db_embedding = np.array(data["embedding"])
                distance = cosine_distance(current_embedding, db_embedding)

                if distance < best_distance:
                    best_distance = distance
                    best_student = data["student_id"]

            if best_distance < THRESHOLD:
                confidence = (1 - best_distance) * 100
                return best_student, confidence

            return None, 0.0

        except Exception as e:
            print("Recognition Error:", e)
            return None, 0.0

    fps_start = time.time()

    while True:
        ret, frame = camera.read()
        if not ret:
            print("Failed to capture frame.")
            break

        frame = cv2.flip(frame, 1)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face_detector.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(50, 50),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        frame_count += 1

        for (x, y, w, h) in faces:
            if w < 180 or h < 180:
                continue

            face = frame[y:y+h, x:x+w]
            if face.size == 0:
                continue

            # Anti-spoofing check
            bbox = [x, y, x + w, y + h]
            result = anti_spoof.predict(frame, bbox)

            if result["label"] == "Fake":
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
                cv2.putText(frame, "FAKE FACE", (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                continue

            # Heavy DeepFace Recognition on interval frames
            if frame_count % recognition_interval == 0:
                resized_face = cv2.resize(face, (160, 160))
                gray_face = cv2.cvtColor(resized_face, cv2.COLOR_BGR2GRAY)
                blur = cv2.Laplacian(gray_face, cv2.CV_64F).var()

                if blur >= 100:
                    student_id, confidence = recognize_face(resized_face)

                    if student_id is not None:
                        last_seen_time = time.time()  # Refresh active visibility timestamp
                        if candidate_student == student_id:
                            stable_count += 1
                        else:
                            candidate_student = student_id
                            stable_count = 1
                        
                        # Immediately update current active identity once candidate starts matching
                        current_student = student_id
                        current_confidence = confidence
                    else:
                        if stable_count > 0:
                            stable_count -= 1

                    # Trigger Attendance standard match rule
                    if stable_count >= required_matches:
                        if candidate_student not in marked_students:
                            print(f"✅ [MATCH CONFIRMED] Student ID: {candidate_student}. Marking attendance...")
                            mark_attendance(candidate_student)
                            marked_students.add(candidate_student)

            # --- RENDERING (Executes on EVERY frame for continuous display) ---
            is_recent = (time.time() - last_seen_time) < display_duration

            if current_student and is_recent:
                color = (0, 255, 0)
                text = f"ID: {current_student}"
                conf_text = f"{current_confidence:.2f}%"
            else:
                color = (0, 0, 255)
                text = "Unknown"
                conf_text = ""

            # Draw bounding box
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

            # Draw Student ID label above bounding box
            cv2.putText(frame, text, (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

            # Draw confidence score below bounding box
            if conf_text:
                cv2.putText(frame, conf_text, (x, y + h + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        # UI Overlays
        fps = 1 / (time.time() - fps_start)
        fps_start = time.time()

        cv2.putText(frame, f"FPS : {int(fps)}", (500, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        cv2.putText(frame, "SMART FACE ATTENDANCE SYSTEM", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
        cv2.putText(frame, "Press ESC to Exit", (10, 460),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        cv2.imshow("Attendance System", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == 27:
            break

    camera.release()
    cv2.destroyAllWindows()
    print("=" * 50)
    print("Attendance Session Completed")
    print("=" * 50)

if __name__ == "__main__":
    start_recognition()