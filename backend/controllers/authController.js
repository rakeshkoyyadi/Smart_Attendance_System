const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const registerStudent = async (req, res) => {
    try {
        const {
            student_id,
            student_name,
            department,
            year,
            section,
            email,
            password
        } = req.body;

        if (
            !student_id ||
            !student_name ||
            !department ||
            !year ||
            !section ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Check if student already exists
        const [existing] = await pool.query(
            "SELECT * FROM students WHERE student_id = ? OR email = ?",
            [student_id, email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Student already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert student
        await pool.query(
            `INSERT INTO students
            (student_id, student_name, department, year, section, email, password)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                student_id,
                student_name,
                department,
                year,
                section,
                email,
                hashedPassword
            ]
        );

        res.status(201).json({
            success: true,
            message: "Student registered successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
const loginStudent = async (req, res) => {
    try {
        const { student_id, password } = req.body || {};

        if (!student_id || !password) {
            return res.status(400).json({
                success: false,
                message: "Student ID and password are required"
            });
        }

        // Find student
        const [students] = await pool.query(
            "SELECT * FROM students WHERE student_id = ?",
            [student_id]
        );

        if (students.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid Student ID or password"
            });
        }

        const student = students[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            student.password
        );
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid Student ID or password"
            });
        }
         const token = jwt.sign(
    {
        student_id: student.student_id
    },
    process.env.JWT_SECRET,
    {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
);
      res.status(200).json({
    success: true,

    message: student.first_login
        ? "First login. Mobile verification required."
        : "Login successful",

    first_login: Boolean(student.first_login),

    token,

    student: {
        student_id: student.student_id,
        student_name: student.student_name,
        department: student.department,
        year: student.year,
        section: student.section,
        email: student.email
    }
});

    } catch (error) {
        console.error("Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
const registerMobileNumber = async (req, res) => {
    try {

        const { student_id, mobile_number } = req.body || {};

        if (!student_id || !mobile_number) {
            return res.status(400).json({
                success: false,
                message: "Student ID and mobile number are required"
            });
        }

        // Basic Indian mobile number validation
        const mobileRegex = /^[6-9]\d{9}$/;

        if (!mobileRegex.test(mobile_number)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit mobile number"
            });
        }

        // Check whether student exists
        const [students] = await pool.query(
            "SELECT student_id, first_login, mobile_number FROM students WHERE student_id = ?",
            [student_id]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const student = students[0];

        // Mobile number can only be registered during first-time setup
        if (!student.first_login) {
            return res.status(400).json({
                success: false,
                message: "Mobile number registration is already completed"
            });
        }

        // Check if the mobile number belongs to another student
        const [existingMobile] = await pool.query(
            `SELECT student_id
             FROM students
             WHERE mobile_number = ?
             AND student_id != ?`,
            [mobile_number, student_id]
        );

        if (existingMobile.length > 0) {
            return res.status(400).json({
                success: false,
                message: "This mobile number is already registered with another student"
            });
        }

        // Save mobile number
        await pool.query(
            `UPDATE students
             SET mobile_number = ?,
                 mobile_verified = FALSE
             WHERE student_id = ?`,
            [mobile_number, student_id]
        );

        res.status(200).json({
            success: true,
            message: "Mobile number saved successfully. OTP verification required."
        });

    } catch (error) {

        console.error("Register Mobile Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
const sendOTP = async (req, res) => {

    try {

        const { student_id } = req.body || {};

        if (!student_id) {

            return res.status(400).json({
                success: false,
                message: "Student ID is required"
            });

        }

        // Check student
        const [students] = await pool.query(
            `SELECT student_id, mobile_number
             FROM students
             WHERE student_id = ?`,
            [student_id]
        );

        if (students.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Student not found"
            });

        }

        const student = students[0];

        if (!student.mobile_number) {

            return res.status(400).json({
                success: false,
                message: "Mobile number is not registered"
            });

        }

        // Generate secure 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();

        // Hash OTP before storing
        const otpHash = await bcrypt.hash(otp, 10);

        // OTP valid for 10 minutes
        const expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Remove previous OTPs for this student
        await pool.query(
            `DELETE FROM otp_verifications
             WHERE student_id = ?`,
            [student_id]
        );

        // Save new OTP
        await pool.query(
            `INSERT INTO otp_verifications
            (student_id, otp_hash, expires_at, verified)
            VALUES (?, ?, ?, FALSE)`,
            [
                student_id,
                otpHash,
                expiresAt
            ]
        );

        console.log(
            `OTP for ${student_id}: ${otp}`
        );

        res.status(200).json({

            success: true,

            message:
                "OTP generated successfully. Check server console for development OTP.",

            // DEVELOPMENT ONLY
            otp: otp

        });

    } catch (error) {

        console.error(
            "Send OTP Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};
const verifyOTP = async (req, res) => {

    try {

        const {
            student_id,
            otp
        } = req.body || {};

        if (!student_id || !otp) {

            return res.status(400).json({
                success: false,
                message: "Student ID and OTP are required"
            });

        }

        // Get latest OTP
        const [otpRecords] = await pool.query(
            `SELECT *
             FROM otp_verifications
             WHERE student_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [student_id]
        );

        if (otpRecords.length === 0) {

            return res.status(404).json({
                success: false,
                message: "OTP not found. Please request a new OTP."
            });

        }

        const otpRecord = otpRecords[0];

        // Check whether OTP already verified
        if (otpRecord.verified) {

            return res.status(400).json({
                success: false,
                message: "OTP already used"
            });

        }

        // Check expiry
        const currentTime = new Date();

        if (currentTime > new Date(otpRecord.expires_at)) {

            return res.status(400).json({
                success: false,
                message: "OTP expired. Please request a new OTP."
            });

        }

        // Compare OTP with stored hash
        const isValid = await bcrypt.compare(
            otp,
            otpRecord.otp_hash
        );

        if (!isValid) {

            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });

        }

        // Mark OTP as verified
        await pool.query(
            `UPDATE otp_verifications
             SET verified = TRUE
             WHERE otp_id = ?`,
            [otpRecord.otp_id]
        );

        // Mark student's mobile as verified
        await pool.query(
            `UPDATE students
             SET mobile_verified = TRUE
             WHERE student_id = ?`,
            [student_id]
        );

        res.status(200).json({

            success: true,

            message:
                "Mobile number verified successfully. You can now change your password."

        });

    } catch (error) {

        console.error(
            "Verify OTP Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};
const changePassword = async (req, res) => {

    try {

        const {
            student_id,
            new_password
        } = req.body || {};

        // Check required fields
        if (!student_id || !new_password) {

            return res.status(400).json({
                success: false,
                message: "Student ID and new password are required"
            });

        }

        // Basic password validation
        if (new_password.length < 6) {

            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters"
            });

        }

        // Check student and verification status
        const [students] = await pool.query(
            `SELECT student_id, mobile_verified, first_login
             FROM students
             WHERE student_id = ?`,
            [student_id]
        );

        if (students.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Student not found"
            });

        }

        const student = students[0];

        // Mobile must be verified before changing password
        if (!student.mobile_verified) {

            return res.status(403).json({
                success: false,
                message: "Please verify your mobile number before changing the password"
            });

        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(
            new_password,
            10
        );

        // Update password and complete first login
        await pool.query(
            `UPDATE students
             SET password = ?,
                 first_login = FALSE
             WHERE student_id = ?`,
            [
                hashedPassword,
                student_id
            ]
        );

        res.status(200).json({
            success: true,
            message: "Password changed successfully. Account setup completed."
        });

    } catch (error) {

        console.error(
            "Change Password Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

const getStudentProfile = async (req, res) => {
    try {

        // Student ID from JWT
        const student_id = req.student.student_id;

        // Get student profile
        const [students] = await pool.query(
            `SELECT
                student_id,
                student_name,
                department,
                year,
                section,
                email,
                mobile_number,
                mobile_verified,
                first_login
             FROM students
             WHERE student_id = ?`,
            [student_id]
        );

        // Student not found
        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const student = students[0];

        return res.status(200).json({
            success: true,
            student: {
                student_id: student.student_id,
                student_name: student.student_name,
                department: student.department,
                year: student.year,
                section: student.section,
                email: student.email,
                mobile_number: student.mobile_number,
                mobile_verified: Boolean(student.mobile_verified),
                first_login: Boolean(student.first_login)
            }
        });

    } catch (error) {

        console.error(
            "Get Student Profile Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};
module.exports = {
    registerStudent,
    loginStudent,
    registerMobileNumber,
    sendOTP,
    verifyOTP,
    changePassword,
    getStudentProfile
};