from datetime import datetime
from database import get_connection


def mark_attendance(student_id):
    conn = get_connection()

    if conn is None:
        return

    cursor = conn.cursor()

    today = datetime.now().date()

    # Check if attendance already exists today
    cursor.execute("""
        SELECT * FROM attendance
        WHERE student_id=%s
        AND attendance_date=%s
    """, (student_id, today))

    result = cursor.fetchone()

    if result:
        print(f"Attendance already marked for {student_id}")

    else:
        # Get student name
        cursor.execute("""
            SELECT student_name
            FROM students
            WHERE student_id=%s
        """, (student_id,))

        student = cursor.fetchone()

        if student is None:
            print("Student not found.")

        else:
            student_name = student[0]

            current_time = datetime.now().strftime("%H:%M:%S")

            cursor.execute("""
                INSERT INTO attendance
                (student_id, student_name, attendance_date, entry_time, status)
                VALUES (%s,%s,%s,%s,%s)
            """, (
                student_id,
                student_name,
                today,
                current_time,
                "Present"
            ))

            conn.commit()

            print(f"{student_name} Attendance Marked Successfully")

    cursor.close()
    conn.close()