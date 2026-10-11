import os
import cv2

DATASET_PATH = "dataset"

face_detector = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)

print("=" * 50)
print("Cropping Faces...")
print("=" * 50)

for student_id in os.listdir(DATASET_PATH):

    student_folder = os.path.join(DATASET_PATH, student_id)

    if not os.path.isdir(student_folder):
        continue

    print(f"\nProcessing {student_id}")

    for image_name in os.listdir(student_folder):

        image_path = os.path.join(student_folder, image_name)

        image = cv2.imread(image_path)

        if image is None:
            continue

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        faces = face_detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100,100)
        )

        if len(faces) == 0:
            print(f"No face found : {image_name}")
            continue

        # Largest face
        x, y, w, h = max(faces, key=lambda f: f[2]*f[3])

        face = image[y:y+h, x:x+w]

        face = cv2.resize(face, (224,224))

        cv2.imwrite(image_path, face)

print("\n===================================")
print("All Faces Cropped Successfully")
print("===================================")