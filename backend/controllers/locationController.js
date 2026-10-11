const pool = require("../config/db");


// Calculate distance using Haversine Formula
const calculateDistance = (
    lat1,
    lon1,
    lat2,
    lon2
) => {

    const R = 6371000; // Earth's radius in meters

    const toRadians = (degree) => {
        return degree * (Math.PI / 180);
    };

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
};


// Verify Student Location
const verifyLocation = async (req, res) => {

    try {

        const {
            latitude,
            longitude,
            classroom_id
        } = req.body;


        // Validate location
        if (
            latitude === undefined ||
            longitude === undefined
        ) {

            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required"
            });

        }


        // Student comes from JWT
        const student_id =
            req.student.student_id;


        // Get classroom
        let query =
            "SELECT * FROM classroom";


        let values = [];


        // If classroom_id is provided
        if (classroom_id) {

            query +=
                " WHERE classroom_id = ?";

            values.push(classroom_id);

        }


        const [classrooms] =
            await pool.query(
                query,
                values
            );


        if (
            classrooms.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Classroom not found"
            });

        }


        // Find nearest classroom
        let nearestClassroom =
            null;

        let minimumDistance =
            Infinity;


        for (
            const classroom
            of classrooms
        ) {

            const distance =
                calculateDistance(
                    Number(latitude),
                    Number(longitude),
                    Number(
                        classroom.latitude
                    ),
                    Number(
                        classroom.longitude
                    )
                );


            if (
                distance <
                minimumDistance
            ) {

                minimumDistance =
                    distance;

                nearestClassroom =
                    classroom;

            }

        }


        // Check allowed radius
        const isInside =
            minimumDistance <=
            Number(nearestClassroom.radius);
            // Save location verification
await pool.query(
    `INSERT INTO location_verification
    (
        student_id,
        latitude,
        longitude,
        distance,
        verified,
        verified_time
    )
    VALUES (?, ?, ?, ?, ?, NOW())`,
    [
        student_id,
        Number(latitude),
        Number(longitude),
        Number(minimumDistance.toFixed(2)),
        isInside ? 1 : 0
    ]
);


        return res.status(200).json({

            success: true,

            student_id,

            classroom: {
                classroom_id:
                    nearestClassroom.classroom_id,

                classroom_name:
                    nearestClassroom.classroom_name
            },

            distance_meters:
                Number(
                    minimumDistance.toFixed(2)
                ),

            allowed_radius:
                nearestClassroom.radius,

            location_verified:
                isInside,

            message:
                isInside
                    ? "You are inside the allowed classroom area"
                    : "You are outside the allowed classroom area"

        });

    } catch (error) {

        console.error(
            "Location Verification Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal Server Error"
        });

    }

};


module.exports = {
    verifyLocation
};