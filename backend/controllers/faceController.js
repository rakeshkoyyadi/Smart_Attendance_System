const axios = require("axios");
const FormData = require("form-data");
const pool = require("../config/db");

const verifyFace = async (req, res) => {
    try {
        // 1. Check whether an image was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Face image is required"
            });
        }

        // 2. Get logged-in student ID from JWT
        const loggedInStudentId = req.student.student_id;

        // 3. Create form data for Python FastAPI
        const formData = new FormData();

        formData.append(
            "file",
            req.file.buffer,
            {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            }
        );

        // 4. Send image to Python Face Recognition API
        const response = await axios.post(
            "http://127.0.0.1:8000/recognize-face",
            formData,
            {
                headers: formData.getHeaders()
            }
        );

        const result = response.data;

        console.log("Face API Response:", result);

        // 5. Face not recognized
        if (!result.success) {
            return res.status(400).json({
                success: false,
                face_verified: false,
                message: result.message
            });
        }

        // 6. Check whether recognized face belongs
        //    to the logged-in student
        if (String(result.student_id) !== String(loggedInStudentId)) {
            return res.status(403).json({
                success: false,
                face_verified: false,
                message: "Face does not belong to the logged-in student",
                logged_in_student: loggedInStudentId,
                recognized_student: result.student_id
            });
        }

        // 7. Save successful face verification in database
        await pool.query(
            `INSERT INTO face_verification
            (
                student_id,
                verified,
                confidence,
                distance,
                verified_time
            )
            VALUES (?, ?, ?, ?, NOW())`,
            [
                loggedInStudentId,
                1,
                result.confidence,
                result.distance
            ]
        );

        console.log(
            "Face verification saved for:",
            loggedInStudentId
        );

        // 8. Return successful response
        return res.status(200).json({
            success: true,
            face_verified: true,
            student_id: loggedInStudentId,
            confidence: result.confidence,
            distance: result.distance,
            message: "Face verified successfully"
        });

    } catch (error) {

        console.error(
            "Face Verification Error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Face verification failed"
        });
    }
};

module.exports = {
    verifyFace
};