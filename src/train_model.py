import os
import pickle
from deepface import DeepFace

DATASET_PATH = "src/dataset"
MODEL_PATH = "src/models/face_embeddings.pkl"

os.makedirs("models", exist_ok=True)

embeddings = []

print("=" * 50)
print("Generating Face Embeddings...")
print("=" * 50)

for student_id in os.listdir(DATASET_PATH):

    student_folder = os.path.join(DATASET_PATH, student_id)

    if not os.path.isdir(student_folder):
        continue

    print(f"\nStudent : {student_id}")

    count = 0

    for image_name in os.listdir(student_folder):

        image_path = os.path.join(student_folder, image_name)

        try:

            result = DeepFace.represent(
                img_path=image_path,
                model_name="Facenet512",
                detector_backend="skip",
                enforce_detection=False
            )

            embeddings.append({
                "student_id": student_id,
                "embedding": result[0]["embedding"]
            })

            count += 1

        except Exception as e:

            print(f"Skipped {image_name}: {e}")

    print(f"Embeddings Created : {count}")

with open(MODEL_PATH, "wb") as file:
    pickle.dump(embeddings, file)

print("\n===================================")
print("Training Completed Successfully")
print(f"Embeddings Saved : {MODEL_PATH}")
print("===================================")