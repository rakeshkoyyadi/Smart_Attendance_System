const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const locationRoutes = require("./routes/locationRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const faceRoutes = require("./routes/faceRoutes");
const adminRoutes = require("./routes/adminRoutes");

require("./jobs/attendanceScheduler");


require("dotenv").config();

const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/face", faceRoutes);
app.use("/api/admin", adminRoutes);
app.get("/", async (req, res) => {
    try {
        const connection = await pool.getConnection();

        console.log("MySQL Connected Successfully");

        connection.release();

        res.send("Attendance Backend Running");

    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});