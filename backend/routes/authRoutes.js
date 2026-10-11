const authenticateToken = require("../middleware/authMiddleware");
const express = require("express");

const router = express.Router();

const {
    registerStudent,
    loginStudent,
    registerMobileNumber,
    sendOTP,
    verifyOTP,
    changePassword,
    getStudentProfile
} = require("../controllers/authController");

router.post("/register", registerStudent);

router.post("/login", loginStudent);

router.post("/register-mobile", registerMobileNumber);

router.post("/send-otp", sendOTP);

router.post("/verify-otp", verifyOTP);

router.post("/change-password", changePassword);
router.get(
    "/profile",
    authenticateToken,
    getStudentProfile
);

module.exports = router;