from deepface import DeepFace

result = DeepFace.verify(
    img1_path="current.jpg",
    img2_path="dataset/2411CS060018/image1.jpg",
    enforce_detection=True
)

print(result)