
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function saveAttendanceToExcel(record) {
    const {
        student_id,
        student_name,
        attendance_date,
        entry_time,
        exit_time = null,
        status = "Present",
        session_name
    } = record;

    if (!session_name || !attendance_date) {
        throw new Error("Session name and attendance date are required");
    }

    const reportsDir = path.join(__dirname, "..", "reports");
    fs.mkdirSync(reportsDir, { recursive: true });

    const date = String(attendance_date).slice(0, 10);
    const session = String(session_name).trim().toLowerCase();

    if (!["morning", "afternoon"].includes(session)) {
        throw new Error(`Invalid attendance session: ${session_name}`);
    }

    const sessionLabel =
        session.charAt(0).toUpperCase() + session.slice(1);

    const filePath = path.join(
        reportsDir,
        `${sessionLabel}_Attendance_${date}.xlsx`
    );

    const workbook = new ExcelJS.Workbook();

    if (fs.existsSync(filePath)) {
        await workbook.xlsx.readFile(filePath);
    }

    let sheet = workbook.getWorksheet("Attendance");

    if (!sheet) {
        sheet = workbook.addWorksheet("Attendance");

        sheet.columns = [
            { header: "Student ID", key: "student_id", width: 15 },
            { header: "Student Name", key: "student_name", width: 25 },
            { header: "Date", key: "date", width: 15 },
            { header: "Entry Time", key: "entry_time", width: 15 },
            { header: "Exit Time", key: "exit_time", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Session", key: "session", width: 15 }
        ];

        sheet.getRow(1).font = { bold: true };
    }

    // Prevent duplicate rows for the same student in this session.
    const duplicate = sheet.getRows(2, Math.max(sheet.rowCount - 1, 1))
        ?.some(row =>
            String(row.getCell(1).value) === String(student_id)
        );

    if (!duplicate) {
        sheet.addRow({
            student_id,
            student_name,
            date,
            entry_time,
            exit_time,
            status,
            session: sessionLabel
        });

        await workbook.xlsx.writeFile(filePath);
    }

    return filePath;
}

module.exports = { saveAttendanceToExcel };