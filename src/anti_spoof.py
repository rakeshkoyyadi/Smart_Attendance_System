import cv2
import numpy as np
import onnxruntime as ort


class AntiSpoofingONNX:

    def __init__(self,
                 model_path="src/models/anti_spoof/MiniFASNetV2.onnx",
                 scale=2.7):

        self.scale = scale

        self.session = ort.InferenceSession(
            model_path,
            providers=[
                "CPUExecutionProvider"
            ]
        )

        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

        input_shape = self.session.get_inputs()[0].shape

        self.input_height = input_shape[2]
        self.input_width = input_shape[3]

    #############################################################

    def xyxy2xywh(self, bbox):

        x1, y1, x2, y2 = bbox

        return [
            int(x1),
            int(y1),
            int(x2 - x1),
            int(y2 - y1)
        ]

    #############################################################

    def crop_face(self, image, bbox):

        x, y, w, h = bbox

        H, W = image.shape[:2]

        scale = min(
            (H - 1) / h,
            (W - 1) / w,
            self.scale
        )

        new_w = int(w * scale)
        new_h = int(h * scale)

        center_x = x + w // 2
        center_y = y + h // 2

        x1 = max(0, center_x - new_w // 2)
        y1 = max(0, center_y - new_h // 2)

        x2 = min(W, center_x + new_w // 2)
        y2 = min(H, center_y + new_h // 2)

        crop = image[y1:y2, x1:x2]

        if crop.size == 0:
            return None

        crop = cv2.resize(
            crop,
            (self.input_width, self.input_height)
        )

        return crop

    #############################################################

    def preprocess(self, image):

        image = image.astype(np.float32)

        image = np.transpose(image, (2, 0, 1))

        image = np.expand_dims(image, axis=0)

        return image

    #############################################################

    def softmax(self, x):

        exp = np.exp(x - np.max(x))

        return exp / exp.sum()

    #############################################################

    def predict(self, frame, bbox_xyxy):

        bbox = self.xyxy2xywh(bbox_xyxy)

        face = self.crop_face(frame, bbox)

        if face is None:

            return {
                "label": "Fake",
                "score": 0.0
            }

        input_tensor = self.preprocess(face)

        outputs = self.session.run(
            [self.output_name],
            {
                self.input_name: input_tensor
            }
        )

        logits = outputs[0][0]

        probs = self.softmax(logits)

        label = np.argmax(probs)

        score = float(probs[label])

        return {

            "label": "Real" if label == 1 else "Fake",

            "score": score

        }