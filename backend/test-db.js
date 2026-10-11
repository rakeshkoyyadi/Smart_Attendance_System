const pool = require("./config/db");

async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("MySQL connection successful!");

        const [rows] = await connection.query(
            "SELECT DATABASE() AS database_name"
        );

        console.log("Connected database:", rows[0].database_name);

        connection.release();
        await pool.end();

    } catch (error) {
        console.error("MySQL connection failed!");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
    }
}

testConnection();