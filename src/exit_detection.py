from datetime import datetime
from database import get_connection


def mark_exit(student_id):

    conn = get_connection()

    if conn is None:
        return

    cursor = conn.cursor()

    today = datetime.now().date()
    current_time = datetime.now().strftime("%H:%M:%S")

    # Check whether today's attendance exists
    cursor.execute("""
        SELECT exit_time
        FROM attendance
        WHERE student_id=%s
        AND attendance_date=%s
    """, (student_id, today))

    result = cursor.fetchone()

    if result is None:
        print("Attendance not marked yet.")
    else:

        # Exit already marked
        if result[0] is not None:
            print(f"Exit already marked for {student_id}")

        else:

            cursor.execute("""
                UPDATE attendance
                SET exit_time=%s
                WHERE student_id=%s
                AND attendance_date=%s
            """,
            (
                current_time,
                student_id,
                today
            ))

            conn.commit()

            print(f"Exit Time Updated Successfully for {student_id}")

    cursor.close()
    conn.close()


# -------------------------
# Testing
# -------------------------
if __name__ == "__main__":

    mark_exit("2411CS060018")