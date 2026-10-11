const express = require("express");

const router = express.Router();

const {
    markAttendance,
    markExit,
    getAttendanceHistory,
    getAttendanceSummary,
    getStudentDashboard
} = require(
    "../controllers/attendanceController"
);

const authenticateToken =
    require(
        "../middleware/authMiddleware"
    );


// Protected attendance API
router.post(
    "/mark",
    authenticateToken,
    markAttendance
);

router.post(
    "/exit",
    authenticateToken,
    markExit
);

router.get(
    "/history",
    authenticateToken,
    getAttendanceHistory
);

router.get(
    "/summary",
    authenticateToken,
    getAttendanceSummary
);

router.get(
    "/dashboard",
    authenticateToken,
    getStudentDashboard
);

module.exports = router;