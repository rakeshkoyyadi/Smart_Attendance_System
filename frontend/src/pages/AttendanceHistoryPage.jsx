import React, { useEffect, useState } from "react";
import API from "../services/api";

const AttendanceHistoryPage = () => {
const [history, setHistory] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const token = localStorage.getItem("token");

useEffect(() => {
    const loadHistory = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await API.get("/attendance/history", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const records =
                response.data?.attendance ||
                response.data?.data ||
                [];

            setHistory(Array.isArray(records) ? records : []);
        } catch (err) {
            console.error("Attendance history error:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load attendance history."
            );
        } finally {
            setLoading(false);
        }
    };

    if (token) {
        loadHistory();
    } else {
        setError("Please login again.");
        setLoading(false);
    }
}, [token]);

const formatDate = (date) => {
    if (!date) return "-";

    const d = new Date(date);

    if (isNaN(d.getTime())) return date;

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const getStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (value === "present") {
        return "present";
    }

    return "absent";
};

const getStatusText = (status) => {
    const value = String(status || "").toLowerCase();

    return value === "present" ? "Present" : "Absent";
};

const goToDashboard = () => {
    window.location.href = "/dashboard";
};

const presentCount = history.filter(
    (record) =>
        String(record.status || "").toLowerCase() === "present"
).length;

const absentCount = history.filter(
    (record) =>
        String(record.status || "").toLowerCase() === "absent"
).length;

if (loading) {
    return (
        <div className="attendance-history-page">
            <div className="history-loading">
                <div className="loading-spinner">⏳</div>
                <h2>Loading Attendance History...</h2>
                <p>Please wait.</p>
            </div>
        </div>
    );
}

return (
    <div className="attendance-history-page">

        {/* PAGE HEADER */}
        <div className="history-page-header">

            <div>
                <p>Student Attendance</p>
                <h1>ATTENDANCE RECORDS</h1>
                <p>
                    View your complete attendance history
                </p>
            </div>

            <button
                type="button"
                className="back-dashboard-button"
                onClick={goToDashboard}
            >
                ← Back to Dashboard
            </button>

        </div>

        {/* ERROR */}
        {error && (
            <div className="history-error">
                {error}
            </div>
        )}

        {/* SUMMARY */}
        <div className="history-summary">

            <div className="history-summary-card">
                <span>Total Records</span>
                <strong>{history.length}</strong>
            </div>

            <div className="history-summary-card">
                <span>Present</span>
                <strong>{presentCount}</strong>
            </div>

            <div className="history-summary-card">
                <span>Absent</span>
                <strong>{absentCount}</strong>
            </div>

        </div>

        {/* ATTENDANCE TABLE */}
        <div className="attendance-table-card">

            <div className="attendance-table-header">

                <div>
                    <h2>Attendance History</h2>
                    <p>
                        Your day-to-day attendance records
                    </p>
                </div>

                <span className="record-count">
                    {history.length} Records
                </span>

            </div>

            {history.length === 0 ? (

                <div className="no-history-page">

                    <div className="no-history-icon">
                        📋
                    </div>

                    <h2>No Attendance Records</h2>

                    <p>
                        Your attendance records will appear here
                        after you mark attendance.
                    </p>

                    <button
                        type="button"
                        className="back-dashboard-button"
                        onClick={goToDashboard}
                    >
                        ← Back to Dashboard
                    </button>

                </div>

            ) : (

                <div className="attendance-table-wrapper">

                    <table className="attendance-history-table">

                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Session</th>
                                <th>Status</th>
                                <th>Entry Time</th>
                                <th>Location</th>
                                <th>Face</th>
                            </tr>
                        </thead>

                        <tbody>

                            {history.map((record, index) => {

                                const statusClass =
                                    getStatusClass(record.status);

                                return (
                                    <tr
                                        key={
                                            record.attendance_id ||
                                            index
                                        }
                                    >

                                        <td className="record-number">
                                            {index + 1}
                                        </td>

                                        <td className="record-date">
                                            {formatDate(
                                                record.attendance_date
                                            )}
                                        </td>

                                        <td>
                                            <span className="session-badge">
                                                {
                                                    record.session_name ||
                                                    record.session ||
                                                    "Unknown Session"
                                                }
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={`history-status ${statusClass}`}
                                            >
                                                {getStatusText(
                                                    record.status
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            {record.entry_time || "-"}
                                        </td>

                                        <td>
                                            <span
                                                className={`verification-pill ${
                                                    record.location_verified
                                                        ? "verified"
                                                        : "not-verified"
                                                }`}
                                            >
                                                {record.location_verified
                                                    ? "Verified"
                                                    : "Not Verified"}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={`verification-pill ${
                                                    record.face_verified
                                                        ? "verified"
                                                        : "not-verified"
                                                }`}
                                            >
                                                {record.face_verified
                                                    ? "Verified"
                                                    : "Not Verified"}
                                            </span>
                                        </td>

                                    </tr>
                                );
                            })}

                        </tbody>

                    </table>

                </div>

            )}

        </div>

    </div>
);

};

export default AttendanceHistoryPage;
