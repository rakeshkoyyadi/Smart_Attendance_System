import React from "react";

const AttendanceCard = ({ attendance }) => {

    const percentage =
        attendance?.percentage || 0;

    const present =
        attendance?.present || 0;

    const absent =
        attendance?.absent || 0;

    const total =
        attendance?.total || 0;

    const openAttendanceHistory = () => {
        window.location.href = "/attendance-history";
    };

    return (

        <div className="dashboard-card attendance-card">

            <div className="attendance-card-header">

                <h3>
                    Overall Attendance
                </h3>

                <button
                    type="button"
                    className="attendance-history-button"
                    onClick={openAttendanceHistory}
                >
                    📋 Attendance History
                </button>

            </div>

            <div className="attendance-percentage">
                {percentage}%
            </div>

            <p>
                Present: {present}
            </p>

            <p>
                Absent: {absent}
            </p>

            <p>
                Total Classes: {total}
            </p>

        </div>
    );
};

export default AttendanceCard;
