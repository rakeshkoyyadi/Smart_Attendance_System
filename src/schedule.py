from datetime import datetime, timedelta
from database import get_connection


def check_schedule():

    conn = get_connection()

    if conn is None:
        return None

    cursor = conn.cursor()

    # Current time as timedelta
    now = datetime.now()
    current_time = timedelta(
        hours=now.hour,
        minutes=now.minute,
        seconds=now.second
    )

    cursor.execute("""
        SELECT
            session_name,
            start_time,
            end_time
        FROM attendance_schedule
    """)

    sessions = cursor.fetchall()

    for session_name, start_time, end_time in sessions:

        # Convert TIME values if returned as datetime.time
        if hasattr(start_time, "hour"):
            start_time = timedelta(
                hours=start_time.hour,
                minutes=start_time.minute,
                seconds=start_time.second
            )

        if hasattr(end_time, "hour"):
            end_time = timedelta(
                hours=end_time.hour,
                minutes=end_time.minute,
                seconds=end_time.second
            )

        if start_time <= current_time <= end_time:
            cursor.close()
            conn.close()
            return session_name

    cursor.close()
    conn.close()

    return None


if __name__ == "__main__":
    print(check_schedule())