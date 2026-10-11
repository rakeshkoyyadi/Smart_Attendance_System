const pool = require("../config/db");

const {
    saveAttendanceToExcel
} = require("../utils/excelAttendance");


// ============================================================
// MARK ATTENDANCE
// ============================================================

const markAttendance = async (req, res) => {
    try {

        // ------------------------------------------------------
        // 1. GET STUDENT ID FROM JWT
        // ------------------------------------------------------

        const student_id = req.student.student_id;


        // ------------------------------------------------------
        // 2. GET CURRENT DATE AND TIME FROM MYSQL
        //    This avoids JavaScript UTC/IST problems.
        // ------------------------------------------------------

        const [dateTimeResult] = await pool.query(`
            SELECT
                CURDATE() AS attendance_date,
                CURTIME() AS current_time
        `);

        const attendance_date =
            dateTimeResult[0].attendance_date;

        const current_time =
            dateTimeResult[0].current_time;


        // ------------------------------------------------------
        // 3. CHECK HOLIDAY
        // ------------------------------------------------------

        const [holidays] = await pool.query(
            `
            SELECT holiday_name
            FROM holidays
            WHERE holiday_date = ?
            `,
            [attendance_date]
        );

        if (holidays.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    `Today is a holiday: ${holidays[0].holiday_name}`
            });
        }


        // ------------------------------------------------------
        // 4. FIND ACTIVE ATTENDANCE SESSION
        // ------------------------------------------------------

        const [sessions] = await pool.query(
            `
            SELECT *
            FROM attendance_schedule
            WHERE ? BETWEEN start_time AND end_time
            ORDER BY start_time
            LIMIT 1
            `,
            [current_time]
        );

        if (sessions.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Attendance is not available at this time"
            });
        }

        const activeSession = sessions[0];


        // ------------------------------------------------------
        // 5. CHECK RECENT LOCATION VERIFICATION
        // ------------------------------------------------------

        const [locationVerification] = await pool.query(
            `
            SELECT *
            FROM location_verification
            WHERE student_id = ?
            AND verified = 1
            AND verified_time >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ORDER BY verified_time DESC
            LIMIT 1
            `,
            [student_id]
        );

        if (locationVerification.length === 0) {
            return res.status(403).json({
                success: false,
                location_verified: false,
                face_verified: false,
                message:
                    "Recent location verification required before marking attendance"
            });
        }


        // ------------------------------------------------------
        // 6. CHECK RECENT FACE VERIFICATION
        // ------------------------------------------------------

        const [faceVerification] = await pool.query(
            `
            SELECT *
            FROM face_verification
            WHERE student_id = ?
            AND verified = 1
            AND verified_time >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ORDER BY verified_time DESC
            LIMIT 1
            `,
            [student_id]
        );

        if (faceVerification.length === 0) {
            return res.status(403).json({
                success: false,
                location_verified: true,
                face_verified: false,
                message:
                    "Recent face verification required before marking attendance"
            });
        }


        const face_confidence =
            faceVerification[0].confidence;

        const face_distance =
            faceVerification[0].distance;


        // ------------------------------------------------------
        // 7. CHECK DUPLICATE ATTENDANCE
        // ------------------------------------------------------

        const [existingAttendance] = await pool.query(
            `
            SELECT
                attendance_id,
                status
            FROM attendance
            WHERE student_id = ?
            AND attendance_date = ?
            AND session_id = ?
            LIMIT 1
            `,
            [
                student_id,
                attendance_date,
                activeSession.section_id
            ]
        );

        if (existingAttendance.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    `Attendance already marked for the ${activeSession.session_name} session`
            });
        }


        // ------------------------------------------------------
        // 8. GET STUDENT INFORMATION
        // ------------------------------------------------------

        const [students] = await pool.query(
            `
            SELECT
                student_id,
                student_name,
                department,
                year,
                section
            FROM students
            WHERE student_id = ?
            `,
            [student_id]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const student = students[0];

        const student_name =
            student.student_name;


        // ------------------------------------------------------
        // 9. INSERT ATTENDANCE INTO MYSQL
        // ------------------------------------------------------

        await pool.query(
            `
            INSERT INTO attendance
            (
                student_id,
                attendance_date,
                entry_time,
                exit_time,
                status,
                student_name,
                location_verified,
                face_verified,
                session_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                student_id,
                attendance_date,
                current_time,
                null,
                "Present",
                student_name,
                1,
                1,
                activeSession.section_id
            ]
        );


        // ------------------------------------------------------
        // 10. SAVE ATTENDANCE INTO EXCEL
        // ------------------------------------------------------

        let excelUpdated = false;

        try {

            excelUpdated = await saveAttendanceToExcel({
                student_id: student_id,
                student_name: student_name,
                attendance_date: attendance_date,
                entry_time: current_time,
                exit_time: null,
                status: "Present",
                session_name: activeSession.session_name
            });

        } catch (excelError) {

            console.error(
                "Excel Update Error:",
                excelError
            );

        }


        // ------------------------------------------------------
        // 11. SUCCESS RESPONSE
        // ------------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Attendance marked successfully",

            attendance: {

                student_id,

                student_name,

                attendance_date,

                entry_time: current_time,

                exit_time: null,

                session:
                    activeSession.session_name,

                session_id:
                    activeSession.section_id,

                status: "Present",

                location_verified: true,

                face_verified: true,

                face_confidence,

                face_distance,

                excel_updated: excelUpdated

            }

        });

    } catch (error) {

        console.error(
            "Attendance Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



// ============================================================
// MARK EXIT
// ============================================================

const markExit = async (req, res) => {

    try {

        // ------------------------------------------------------
        // 1. GET STUDENT ID
        // ------------------------------------------------------

        const student_id =
            req.student.student_id;


        // ------------------------------------------------------
        // 2. GET CURRENT DATE AND TIME FROM MYSQL
        // ------------------------------------------------------

        const [dateTimeResult] = await pool.query(`
            SELECT
                CURDATE() AS attendance_date,
                CURTIME() AS current_time
        `);

        const attendance_date =
            dateTimeResult[0].attendance_date;

        const current_time =
            dateTimeResult[0].current_time;


        // ------------------------------------------------------
        // 3. GET COLLEGE TIMING
        // ------------------------------------------------------

        const [collegeTiming] = await pool.query(
            `
            SELECT
                start_time,
                end_time
            FROM college_timing
            LIMIT 1
            `
        );

        if (collegeTiming.length === 0) {

            return res.status(500).json({
                success: false,
                message:
                    "College timing is not configured"
            });

        }

        const collegeStartTime =
            collegeTiming[0].start_time;

        const collegeEndTime =
            collegeTiming[0].end_time;


        // ------------------------------------------------------
        // 4. FIND TODAY'S LATEST ATTENDANCE
        // ------------------------------------------------------

        const [attendance] = await pool.query(
            `
            SELECT *
            FROM attendance
            WHERE student_id = ?
            AND attendance_date = ?
            ORDER BY attendance_id DESC
            LIMIT 1
            `,
            [
                student_id,
                attendance_date
            ]
        );

        if (attendance.length === 0) {

            return res.status(400).json({
                success: false,
                message:
                    "Attendance not found. Please mark attendance first."
            });

        }

        const attendanceRecord =
            attendance[0];


        // ------------------------------------------------------
        // 5. CHECK EXIT DUPLICATE
        // ------------------------------------------------------

        if (attendanceRecord.exit_time !== null) {

            return res.status(400).json({

                success: false,

                message:
                    "Exit time has already been recorded",

                exit_time:
                    attendanceRecord.exit_time

            });

        }


        // ------------------------------------------------------
        // 6. CHECK LOCATION
        // ------------------------------------------------------

        const [locationVerification] =
            await pool.query(
                `
                SELECT *
                FROM location_verification
                WHERE student_id = ?
                AND verified = 1
                AND verified_time >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                ORDER BY verified_time DESC
                LIMIT 1
                `,
                [student_id]
            );

        if (locationVerification.length === 0) {

            return res.status(403).json({

                success: false,

                location_verified: false,

                message:
                    "Recent location verification required before recording exit"

            });

        }


        // ------------------------------------------------------
        // 7. CHECK FACE
        // ------------------------------------------------------

        const [faceVerification] =
            await pool.query(
                `
                SELECT *
                FROM face_verification
                WHERE student_id = ?
                AND verified = 1
                AND verified_time >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                ORDER BY verified_time DESC
                LIMIT 1
                `,
                [student_id]
            );

        if (faceVerification.length === 0) {

            return res.status(403).json({

                success: false,

                location_verified: true,

                face_verified: false,

                message:
                    "Recent face verification required before recording exit"

            });

        }


        // ------------------------------------------------------
        // 8. UPDATE EXIT TIME IN MYSQL
        // ------------------------------------------------------

        await pool.query(
            `
            UPDATE attendance
            SET exit_time = ?
            WHERE attendance_id = ?
            `,
            [
                current_time,
                attendanceRecord.attendance_id
            ]
        );


        // ------------------------------------------------------
        // 9. CHECK EARLY EXIT
        // ------------------------------------------------------

        const leftEarly =
            current_time < collegeEndTime;


        // ------------------------------------------------------
        // 10. UPDATE EXCEL WITH EXIT TIME
        // ------------------------------------------------------

        let excelUpdated = false;

        try {

            excelUpdated =
                await saveAttendanceToExcel({

                    student_id:

                        student_id,

                    student_name:

                        attendanceRecord.student_name,

                    attendance_date:

                        attendance_date,

                    entry_time:

                        attendanceRecord.entry_time,

                    exit_time:

                        current_time,

                    status:

                        attendanceRecord.status,

                    session_name:

                        attendanceRecord.session_id

                });

        } catch (excelError) {

            console.error(
                "Excel Exit Update Error:",
                excelError
            );

        }


        // ------------------------------------------------------
        // 11. SUCCESS RESPONSE
        // ------------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "Exit time recorded successfully",

            exit: {

                student_id,

                attendance_id:
                    attendanceRecord.attendance_id,

                attendance_date,

                entry_time:
                    attendanceRecord.entry_time,

                exit_time:
                    current_time,

                college_start_time:
                    collegeStartTime,

                college_end_time:
                    collegeEndTime,

                left_early:

                    leftEarly,

                location_verified:
                    true,

                face_verified:
                    true,

                excel_updated:
                    excelUpdated

            }

        });

    } catch (error) {

        console.error(
            "Exit Attendance Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Internal Server Error"

        });

    }
};



// ============================================================
// GET ATTENDANCE HISTORY
// ============================================================

const getAttendanceHistory = async (req, res) => {

    try {

        const student_id =
            req.student.student_id;


        const sql = `

            SELECT

                a.attendance_id,

                a.student_id,

                DATE_FORMAT(
                    a.attendance_date,
                    '%Y-%m-%d'
                ) AS attendance_date,

                TIME_FORMAT(
                    a.entry_time,
                    '%h:%i %p'
                ) AS entry_time,

                CASE

                    WHEN a.exit_time IS NOT NULL

                    THEN TIME_FORMAT(
                        a.exit_time,
                        '%h:%i %p'
                    )

                    ELSE NULL

                END AS exit_time,

                a.status,

                a.student_name,

                a.location_verified,

                a.face_verified,

                a.session_id,

                COALESCE(
                    s.session_name,
                    'Unknown Session'
                ) AS session_name

            FROM attendance AS a

            LEFT JOIN attendance_schedule AS s

                ON a.session_id =
                   s.section_id

            WHERE a.student_id = ?

            ORDER BY
                a.attendance_date DESC,
                a.attendance_id DESC

        `;


        const [attendance] =
            await pool.query(
                sql,
                [student_id]
            );


        return res.status(200).json({

            success: true,

            student_id,

            total_records:
                attendance.length,

            attendance

        });

    } catch (error) {

        console.error(
            "Attendance History Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Internal Server Error"

        });

    }

};



// ============================================================
// GET ATTENDANCE SUMMARY
// ============================================================

const getAttendanceSummary = async (req, res) => {

    try {

        const student_id =
            req.student.student_id;


        const [result] =
            await pool.query(
                `
                SELECT

                    COUNT(*) AS total_days,

                    SUM(
                        CASE
                            WHEN status = 'Present'
                            THEN 1
                            ELSE 0
                        END
                    ) AS present_days,

                    SUM(
                        CASE
                            WHEN status = 'Absent'
                            THEN 1
                            ELSE 0
                        END
                    ) AS absent_days

                FROM attendance

                WHERE student_id = ?

                `,
                [student_id]
            );


        const total_days =
            Number(
                result[0].total_days || 0
            );


        const present_days =
            Number(
                result[0].present_days || 0
            );


        const absent_days =
            Number(
                result[0].absent_days || 0
            );


        const attendance_percentage =

            total_days > 0

                ? Number(
                    (
                        (present_days /
                        total_days) *
                        100
                    ).toFixed(2)
                )

                : 0;


        return res.status(200).json({

            success: true,

            student_id,

            total_days,

            present_days,

            absent_days,

            attendance_percentage

        });

    } catch (error) {

        console.error(
            "Attendance Summary Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Internal Server Error"

        });

    }

};



// ============================================================
// GET STUDENT DASHBOARD
// ============================================================

const getStudentDashboard = async (req, res) => {

    try {

        const student_id =
            req.student.student_id;


        // ------------------------------------------------------
        // 1. STUDENT PROFILE
        // ------------------------------------------------------

        const [students] =
            await pool.query(
                `
                SELECT

                    student_id,

                    student_name,

                    department,

                    year,

                    section

                FROM students

                WHERE student_id = ?

                `,
                [student_id]
            );


        if (students.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Student not found"

            });

        }


        const student =
            students[0];


        // ------------------------------------------------------
        // 2. TODAY'S ATTENDANCE
        // ------------------------------------------------------

        const [todayAttendance] =
            await pool.query(
                `
                SELECT

                    attendance_id,

                    DATE_FORMAT(
                        attendance_date,
                        '%Y-%m-%d'
                    ) AS attendance_date,

                    TIME_FORMAT(
                        entry_time,
                        '%h:%i %p'
                    ) AS entry_time,

                    CASE

                        WHEN exit_time IS NOT NULL

                        THEN TIME_FORMAT(
                            exit_time,
                            '%h:%i %p'
                        )

                        ELSE NULL

                    END AS exit_time,

                    status,

                    session_id,

                    location_verified,

                    face_verified

                FROM attendance

                WHERE student_id = ?

                AND attendance_date =
                    CURDATE()

                ORDER BY
                    attendance_id DESC

                LIMIT 1

                `,
                [student_id]
            );


        // ------------------------------------------------------
        // 3. ATTENDANCE SUMMARY
        // ------------------------------------------------------

        const [summaryResult] =
            await pool.query(
                `
                SELECT

                    COUNT(*) AS total_days,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN status = 'Present'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS present_days,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN status = 'Absent'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS absent_days

                FROM attendance

                WHERE student_id = ?

                `,
                [student_id]
            );


        const total_days =
            Number(
                summaryResult[0].total_days || 0
            );


        const present_days =
            Number(
                summaryResult[0].present_days || 0
            );


        const absent_days =
            Number(
                summaryResult[0].absent_days || 0
            );


        const attendance_percentage =

            total_days > 0

                ? Number(
                    (
                        (present_days /
                        total_days) *
                        100
                    ).toFixed(2)
                )

                : 0;


        // ------------------------------------------------------
        // 4. SUCCESS RESPONSE
        // ------------------------------------------------------

        return res.status(200).json({

            success: true,

            student: {

                student_id:
                    student.student_id,

                student_name:
                    student.student_name,

                department:
                    student.department,

                year:
                    student.year,

                section:
                    student.section

            },


            today:

                todayAttendance.length > 0

                    ? {

                        attendance_id:
                            todayAttendance[0]
                                .attendance_id,

                        attendance_date:
                            todayAttendance[0]
                                .attendance_date,

                        entry_time:
                            todayAttendance[0]
                                .entry_time,

                        exit_time:
                            todayAttendance[0]
                                .exit_time,

                        status:
                            todayAttendance[0]
                                .status,

                        session_id:
                            todayAttendance[0]
                                .session_id,

                        location_verified:
                            Boolean(
                                todayAttendance[0]
                                    .location_verified
                            ),

                        face_verified:
                            Boolean(
                                todayAttendance[0]
                                    .face_verified
                            )

                    }

                    : null,


            summary: {

                total_days,

                present_days,

                absent_days,

                attendance_percentage

            }

        });

    } catch (error) {

        console.error(
            "Student Dashboard Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Internal Server Error"

        });

    }

};



// ============================================================
// EXPORT
// ============================================================

module.exports = {

    markAttendance,

    markExit,

    getAttendanceHistory,

    getAttendanceSummary,

    getStudentDashboard

};