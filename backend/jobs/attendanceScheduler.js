const cron = require("node-cron");
const db = require("../config/db");

const {
    saveAttendanceToExcel
} = require("../utils/excelAttendance");

// ============================================================
// MARK STUDENTS ABSENT AFTER SESSION CLOSES
// ============================================================

const markAbsentStudents = async (sessionId, sessionName) => {

    try {

        console.log(
            `\n[ATTENDANCE] Checking ${sessionName} session...`
        );

        // Use MySQL date so database and scheduler stay consistent
        const [[dateResult]] = await db.query(`
            SELECT CURDATE() AS today
        `);

        const today = dateResult.today;

        // ====================================================
        // CHECK HOLIDAY
        // ====================================================

        const [holidays] = await db.query(
            `
            SELECT holiday_name
            FROM holidays
            WHERE holiday_date = ?
            `,
            [today]
        );

        if (holidays.length > 0) {

            console.log(
                `[ATTENDANCE] Today is a holiday: ${holidays[0].holiday_name}`
            );

            console.log(
                `[ATTENDANCE] ${sessionName} attendance not processed.`
            );

            return;
        }

        // ====================================================
        // GET ALL STUDENTS
        // ====================================================

        const [students] = await db.query(`
            SELECT
                student_id,
                student_name
            FROM students
        `);

        console.log(
            `[ATTENDANCE] Total students: ${students.length}`
        );

        let absentCount = 0;
        let alreadyMarkedCount = 0;

        // ====================================================
        // CHECK EACH STUDENT
        // ====================================================

        for (const student of students) {

            const [existing] = await db.query(
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
                    student.student_id,
                    today,
                    sessionId
                ]
            );

            // =================================================
            // ALREADY PRESENT
            // =================================================

            if (
                existing.length > 0 &&
                existing[0].status === "Present"
            ) {

                alreadyMarkedCount++;

                continue;
            }

            // =================================================
            // ALREADY ABSENT
            // Avoid duplicate records
            // =================================================

            if (
                existing.length > 0 &&
                existing[0].status === "Absent"
            ) {

                alreadyMarkedCount++;

                continue;
            }

            // =================================================
            // NO ATTENDANCE RECORD
            // CREATE ABSENT
            // =================================================

            await db.query(
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
                VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?)
                `,
                [
                    student.student_id,
                    today,
                    "Absent",
                    student.student_name,
                    0,
                    0,
                    sessionId
                ]
            );

            absentCount++;

            // =================================================
            // SAVE ABSENT RECORD TO EXCEL
            // =================================================

            try {

                const excelUpdated =
                    await saveAttendanceToExcel({
                        student_id: student.student_id,
                        student_name: student.student_name,
                        attendance_date: today,
                        entry_time: null,
                        exit_time: null,
                        status: "Absent",
                        session_name: sessionName
                    });

                if (!excelUpdated) {

                    console.log(
                        `[EXCEL WARNING] Failed to update Excel for ${student.student_id}`
                    );
                }

            } catch (excelError) {

                console.error(
                    `[EXCEL ERROR] ${student.student_id}:`,
                    excelError.message
                );
            }

            console.log(
                `[ABSENT] ${student.student_id} → ${sessionName}`
            );
        }

        // ====================================================
        // FINAL LOG
        // ====================================================

        console.log(
            `\n[ATTENDANCE] ${sessionName} check completed`
        );

        console.log(
            `[ATTENDANCE] Already marked: ${alreadyMarkedCount}`
        );

        console.log(
            `[ATTENDANCE] Automatically absent: ${absentCount}`
        );

    } catch (error) {

        console.error(
            `[ATTENDANCE ERROR] ${sessionName}:`,
            error
        );
    }
};


// ============================================================
// MORNING SESSION
// 09:10 AM - 09:30 AM
// ============================================================

cron.schedule(
    "30 9 * * *",
    async () => {

        console.log(
            "\n========== MORNING ATTENDANCE CLOSED =========="
        );

        await markAbsentStudents(
            1,
            "Morning"
        );
    },
    {
        timezone: "Asia/Kolkata"
    }
);


// ============================================================
// AFTERNOON SESSION
// 01:20 PM - 01:40 PM
// ============================================================

cron.schedule(
    "40 13 * * *",
    async () => {

        console.log(
            "\n========== AFTERNOON ATTENDANCE CLOSED =========="
        );

        await markAbsentStudents(
            2,
            "Afternoon"
        );
    },
    {
        timezone: "Asia/Kolkata"
    }
);


// ============================================================
// STARTUP MESSAGE
// ============================================================

console.log(
    "\n[ATTENDANCE SCHEDULER] Started successfully."
);

console.log(
    "[ATTENDANCE SCHEDULER] Morning: 09:30"
);

console.log(
    "[ATTENDANCE SCHEDULER] Afternoon: 13:40"
);


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    markAbsentStudents
};

