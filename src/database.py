import mysql.connector

def get_connection():
    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Rakesh@2005",
            database="Attendence_System"
        )

        print("✅ Database Connected Successfully")
        return connection

    except mysql.connector.Error as err:
        print("❌ Error:", err)
        return None


if __name__ == "__main__":
    conn = get_connection()

    if conn:
        conn.close()
        print("Connection Closed")