const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// =====================================================
// ADMIN LOGIN
// =====================================================

const loginAdmin = async (req, res) => {

    try {

        const { admin_username, password } = req.body;


        // Validate input
        if (!admin_username || !password) {
            return res.status(400).json({
                success: false,
                message: "Admin username and password are required."
            });
        }


        // Find admin
        const [admins] = await pool.query(
            `SELECT
                admin_id,
                admin_username,
                admin_name,
                email,
                password,
                role
             FROM admins
             WHERE admin_username = ?`,
            [admin_username]
        );


        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin username or password."
            });
        }


        const admin = admins[0];


        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );


        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin username or password."
            });
        }


        // Create admin JWT
        const token = jwt.sign(
            {
                admin_id: admin.admin_id,
                admin_username: admin.admin_username,
                role: admin.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "7d"
            }
        );


        // Success
        return res.status(200).json({

            success: true,

            message: "Admin login successful.",

            token,

            admin: {
                admin_id: admin.admin_id,
                admin_username: admin.admin_username,
                admin_name: admin.admin_name,
                email: admin.email,
                role: admin.role
            }
        });


    } catch (error) {

        console.error(
            "Admin Login Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const getAttendanceDashboard = async (req, res) => {

    try {

        const today = new Date()
            .toISOString()
            .split("T")[0];


        // ==========================================
        // TOTAL STUDENTS
        // ==========================================

        const [studentResult] = await pool.query(
            `SELECT COUNT(*) AS total_students
             FROM students`
        );

        const total_students =
            Number(studentResult[0].total_students);


        // ==========================================
        // TODAY'S PRESENT / ABSENT
        // ==========================================

        const [attendanceResult] = await pool.query(
            `SELECT
                SUM(CASE
                    WHEN status = 'Present'
                    THEN 1 ELSE 0
                END) AS present,

                SUM(CASE
                    WHEN status = 'Absent'
                    THEN 1 ELSE 0
                END) AS absent

             FROM attendance
             WHERE attendance_date = ?`,
            [today]
        );


        const present =
            Number(attendanceResult[0].present || 0);

        const absent =
            Number(attendanceResult[0].absent || 0);


        // ==========================================
        // EARLY EXITS
        // ==========================================

        const [earlyExitResult] = await pool.query(
            `SELECT COUNT(*) AS early_exits
             FROM attendance a
             JOIN college_timing c
             WHERE a.attendance_date = ?
             AND a.exit_time IS NOT NULL
             AND a.exit_time < c.end_time`,
            [today]
        );


        const early_exits =
            Number(earlyExitResult[0].early_exits || 0);


        // ==========================================
        // ATTENDANCE PERCENTAGE
        // ==========================================

        const attendance_percentage =
            total_students > 0
                ? Number(
                    ((present / total_students) * 100)
                    .toFixed(2)
                )
                : 0;


        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({

            success: true,

            date: today,

            summary: {
                total_students,
                present,
                absent,
                attendance_percentage,
                early_exits
            }

        });


    } catch (error) {

        console.error(
            "Admin Dashboard Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};
module.exports = {
    loginAdmin,
    getAttendanceDashboard
};