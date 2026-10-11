const express = require("express");
const router = express.Router();

const multer = require("multer");

const { verifyFace } = require("../controllers/faceController");
const authenticateToken = require("../middleware/authMiddleware");

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

router.post(
    "/verify",
    authenticateToken,
    upload.single("file"),
    verifyFace
);

module.exports = router;