const express =
    require("express");

const router =
    express.Router();

const {
    verifyLocation
} = require(
    "../controllers/locationController"
);

const authenticateToken =
    require(
        "../middleware/authMiddleware"
    );


// Protected Location API
router.post(
    "/verify",
    authenticateToken,
    verifyLocation
);


module.exports =
    router;