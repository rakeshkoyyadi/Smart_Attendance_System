from datetime import datetime
from database import get_connection


def mark_absent_students():

    conn = get_connection()

    if conn is None:
        return

    cursor = conn.cursor()

    today = datetime.now().date()

    # Get all students
    cursor.execute("""
        SELECT
            student_id,
            student_name
        FROM students
    """)

    all_students = cursor.fetchall()

    # Get students already marked today
    cursor.execute("""
        SELECT student_id
        FROM attendance
        WHERE attendance_date = %s
    """, (today,))

    present_students = cursor.fetchall()

    present_ids = set()

    for row in present_students:
        present_ids.add(row[0])

    absent_count = 0

    for student in all_students:

        student_id = student[0]
        student_name = student[1]

        if student_id not in present_ids:

            cursor.execute("""
                INSERT INTO attendance
                (
                    student_id,
                    student_name,
                    attendance_date,
                    entry_time,
                    exit_time,
                    status
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    NULL,
                    NULL,
                    %s
                )
            """,
            (
                student_id,
                student_name,
                today,
                "Absent"
            ))

            absent_count += 1

    conn.commit()

    print("=" * 50)
    print(f"Absent Students Marked : {absent_count}")
    print("=" * 50)

    cursor.close()
    conn.close()


if __name__ == "__main__":
    mark_absent_students()