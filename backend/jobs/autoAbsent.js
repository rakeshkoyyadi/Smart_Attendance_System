
const cron = require("node-cron");

// Change this path if your MySQL pool is stored elsewhere.
const db = require("../config/db");

const {
    saveAttendanceToExcel
} = require("../utils/excelAttendance");

const TIME_ZONE = "Asia/Kolkata";

function getIndiaDateTime() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const value = Object.fromEntries(
        parts.map(part => [part.type, part.value])
    );

    return {
        date: `${value.year}-${value.month}-${value.day}`,
        time: `${value.hour}:${value.minute}:${value.second}`
    };
}

async function finalizeAbsentAttendance() {
    const { date, time } = getIndiaDateTime();

    try {
        const [sessions] = await db.execute(
            `SELECT section_id, session_name, end_time
             FROM attendance_schedule`
        );

        for (const session of sessions) {
            const endTime = String(session.end_time).slice(0, 8);

            // Do not finalize a session before its end time.
            if (time < endTime) {
                continue;
            }

            // Insert Absent only when no attendance exists for
            // this student, date and session.
            await db.execute(
                `INSERT INTO attendance (
                    student_id,
                    student_name,
                    attendance_date,
                    entry_time,
                    exit_time,
                    status,
                    session_id,
                    location_verified,
                    face_verified
                )
                SELECT
                    s.student_id,
                    s.student_name,
                    ?,
                    NULL,
                    NULL,
                    'Absent',
                    ?,
                    0,
                    0
                FROM students s
                WHERE s.is_active = 1
                  AND NOT EXISTS (
                      SELECT 1
                      FROM attendance a
                      WHERE a.student_id = s.student_id
                        AND a.attendance_date = ?
                        AND a.session_id = ?
                  )`,
                [
                    date,
                    session.section_id,
                    date,
                    session.section_id
                ]
            );

            // Export all Absent records for this session and date.
            const [absentRecords] = await db.execute(
                `SELECT
                    a.student_id,
                    COALESCE(a.student_name, a.student_id)
                        AS student_name,
                    DATE_FORMAT(a.attendance_date, '%Y-%m-%d')
                        AS attendance_date,
                    a.entry_time,
                    a.exit_time,
                    a.status,
                    sch.session_name
                 FROM attendance a
                 JOIN attendance_schedule sch
                   ON sch.section_id = a.session_id
                 WHERE a.attendance_date = ?
                   AND a.session_id = ?
                   AND a.status = 'Absent'`,
                [date, session.section_id]
            );

            for (const record of absentRecords) {
                try {
                    await saveAttendanceToExcel(record);
                } catch (excelError) {
                    console.error(
                        `Excel export failed for ${record.student_id}:`,
                        excelError.message
                    );
                }
            }

            console.log(
                `${session.session_name}: Absent processing completed for ${date}`
            );
        }
    } catch (error) {
        console.error(
            "Automatic Absent processing failed:",
            error.message
        );
    }
}

// Check once per minute and catch up after a server restart.
function startAutoAbsentJob() {
    finalizeAbsentAttendance();

    cron.schedule(
        "* * * * *",
        finalizeAbsentAttendance,
        { timezone: TIME_ZONE }
    );

    console.log("Automatic Absent scheduler started.");
}

module.exports = { startAutoAbsentJob };