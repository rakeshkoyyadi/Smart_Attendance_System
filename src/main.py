import os
import pickle
import numpy as np
import cv2

from fastapi import FastAPI, UploadFile, File
from deepface import DeepFace

from anti_spoof import AntiSpoofingONNX


app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# =========================================================
# LOAD FACE EMBEDDINGS
# =========================================================

embeddings_path = os.path.join(
    BASE_DIR,
    "models",
    "face_embeddings.pkl"
)

with open(embeddings_path, "rb") as file:
    embeddings = pickle.load(file)

print(f"{len(embeddings)} Face Embeddings Loaded")


# =========================================================
# LOAD FACE DETECTOR
# =========================================================

face_detector = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)


# =========================================================
# LOAD ANTI-SPOOF MODEL
# =========================================================

anti_spoof_path = os.path.join(
    BASE_DIR,
    "models",
    "anti_spoof",
    "MiniFASNetV2.onnx"
)

anti_spoof = AntiSpoofingONNX(
    anti_spoof_path
)


# =========================================================
# SETTINGS
# =========================================================

THRESHOLD = 0.35


# =========================================================
# COSINE DISTANCE
# =========================================================

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


# =========================================================
# RECOGNIZE FACE
# =========================================================

def recognize_face(face_image):

    try:

        rgb = cv2.cvtColor(
            face_image,
            cv2.COLOR_BGR2RGB
        )

        result = DeepFace.represent(
            img_path=rgb,
            model_name="Facenet512",
            detector_backend="skip",
            enforce_detection=False
        )

        current_embedding = np.array(
            result[0]["embedding"]
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

        print("Best Student:", best_student)
        print("Best Distance:", best_distance)

        if best_distance < THRESHOLD:

            confidence = (
                1 - best_distance
            ) * 100

            return (
                best_student,
                confidence,
                best_distance
            )

        return None, 0, best_distance

    except Exception as e:

        print("Recognition Error:", e)

        return None, 0, 1


# =========================================================
# FASTAPI FACE RECOGNITION
# =========================================================

@app.post("/recognize-face")
async def recognize_face_api(
    file: UploadFile = File(...)
):

    try:

        print("=" * 60)
        print("FACE VERIFICATION REQUEST")
        print("Filename:", file.filename)
        print("=" * 60)

        # -------------------------------------------------
        # READ IMAGE
        # -------------------------------------------------

        image_bytes = await file.read()

        print(
            "Image size:",
            len(image_bytes),
            "bytes"
        )

        image_array = np.frombuffer(
            image_bytes,
            np.uint8
        )

        frame = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if frame is None:

            return {
                "success": False,
                "recognized": False,
                "message": "Invalid image"
            }


        # -------------------------------------------------
        # FACE DETECTION
        # -------------------------------------------------

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

        print(
            "Faces detected:",
            len(faces)
        )


        if len(faces) == 0:

            return {
                "success": False,
                "recognized": False,
                "message": "No face detected"
            }


        # -------------------------------------------------
        # MULTIPLE FACE CHECK
        # -------------------------------------------------

        if len(faces) > 1:

            return {
                "success": False,
                "recognized": False,
                "message": "Multiple faces detected"
            }


        # -------------------------------------------------
        # GET FACE
        # -------------------------------------------------

        x, y, w, h = faces[0]

        face = frame[
            y:y+h,
            x:x+w
        ]

        if face.size == 0:

            return {
                "success": False,
                "recognized": False,
                "message": "Invalid face region"
            }


        # -------------------------------------------------
        # ANTI-SPOOFING
        # -------------------------------------------------

        bbox = [
            int(x),
            int(y),
            int(x + w),
            int(y + h)
        ]

        spoof_result = anti_spoof.predict(
            frame,
            bbox
        )

        print(
            "Anti-spoof result:",
            spoof_result
        )


        if spoof_result["label"] == "Fake":

            return {
                "success": False,
                "recognized": False,
                "live_face": False,
                "message": "Fake face detected"
            }


        # -------------------------------------------------
        # FACE QUALITY CHECK
        # -------------------------------------------------

        resized_face = cv2.resize(
            face,
            (160, 160)
        )

        gray_face = cv2.cvtColor(
            resized_face,
            cv2.COLOR_BGR2GRAY
        )

        blur = cv2.Laplacian(
            gray_face,
            cv2.CV_64F
        ).var()

        print(
            "Face blur score:",
            blur
        )


        if blur < 100:

            return {
                "success": False,
                "recognized": False,
                "live_face": True,
                "message": "Face image is too blurry"
            }


        # -------------------------------------------------
        # FACE RECOGNITION
        # -------------------------------------------------

        student_id, confidence, distance = recognize_face(
            resized_face
        )


        # -------------------------------------------------
        # NOT RECOGNIZED
        # -------------------------------------------------

        if student_id is None:

            return {
                "success": False,
                "recognized": False,
                "live_face": True,
                "confidence": 0,
                "distance": round(
                    float(distance),
                    4
                ),
                "message": "Face not recognized"
            }


        # -------------------------------------------------
        # SUCCESS
        # -------------------------------------------------

        print("=" * 60)
        print("FACE RECOGNIZED SUCCESSFULLY")
        print("Student ID:", student_id)
        print("Confidence:", confidence)
        print("Distance:", distance)
        print("=" * 60)


        return {

            "success": True,

            "recognized": True,

            "live_face": True,

            "student_id": str(student_id),

            "confidence": round(
                float(confidence),
                2
            ),

            "distance": round(
                float(distance),
                4
            ),

            "message":
                "Face recognized successfully"
        }


    except Exception as e:

        print(
            "Face API Error:",
            e
        )

        return {

            "success": False,

            "recognized": False,

            "message":
                "Face recognition server error"
        }