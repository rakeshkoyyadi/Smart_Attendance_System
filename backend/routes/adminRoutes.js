const express = require("express");

const {
    loginAdmin,
    getAttendanceDashboard
} = require("../controllers/adminController");

const authenticateAdmin =
    require("../middleware/adminAuthMiddleware");

const router = express.Router();

 require("../controllers/adminController");


// ADMIN LOGIN
router.post(
    "/login",
    loginAdmin
);


// ADMIN PROFILE
router.get(
    "/profile",
    authenticateAdmin,
    (req, res) => {

        res.status(200).json({
            success: true,
            message: "Admin profile accessed successfully.",
            admin: req.admin
        });

    }
);

router.get(
    "/dashboard",
    authenticateAdmin,
    getAttendanceDashboard
);

module.exports = router;