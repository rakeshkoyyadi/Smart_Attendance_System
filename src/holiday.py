from datetime import datetime
from database import get_connection


def check_holiday():
    """
    Checks whether today is a holiday.

    Returns:
        True  -> If today is a holiday
        False -> Otherwise
    """

    conn = get_connection()

    if conn is None:
        return False

    cursor = conn.cursor()

    try:
        today = datetime.now().strftime("%Y-%m-%d")

        cursor.execute("""
            SELECT holiday_name
            FROM holidays
            WHERE holiday_date=%s
        """, (today,))

        result = cursor.fetchone()

        if result:
            holiday_name = result[0]

            print("\n==============================")
            print("TODAY IS A HOLIDAY")
            print(f"Holiday : {holiday_name}")
            print("==============================\n")

            return True  # Changed from (True, holiday_name)
        else:
            print("\nToday is a Working Day.\n")
            return False  # Changed from (False, None)

    except Exception as e:
        print("Error :", e)
        return False

    finally:
        cursor.close()
        conn.close()


# -----------------------------------
# Testing
# -----------------------------------
if __name__ == "__main__":
    # Updated testing block to expect a clean boolean match
    if check_holiday():
        print("No attendance today.")
    else:
        print("Attendance system can start.")