import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import API from "../services/api";

import AttendanceCard from "../Components/AttendanceCard";
import Timetable from "../Components/Timetable";
import Announcements from "../Components/Announcements";

// Helper: Convert Base64 Data URL to Blob safely
const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

function Dashboard() {
    // ==============================
    // STUDENT DATA & AUTH
    // ==============================
    const [student] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("student") || "{}");
        } catch (error) {
            console.error("Unable to read saved student profile:", error);
            return {};
        }
    });

    const token = localStorage.getItem("token");

    // ==============================
    // STUDENT PROFILE PHOTO
    // ==============================
    const datasetPhotos = import.meta.glob("../datasets/**/*", {
        eager: true,
        query: "?url",
        import: "default",
    });

    const studentId = String(
        student.student_id || student.studentId || ""
    ).trim().toLowerCase();

    const matchingPhoto = Object.entries(datasetPhotos).find(([path]) => {
        const normalizedPath = path.toLowerCase();
        return studentId !== "" && normalizedPath.includes(studentId);
    });

    const profilePhoto =
        matchingPhoto?.[1] ||
        student.profile_photo ||
        "/default-profile.png";

    // ==============================
    // SESSION WINDOW CHECK (Auto-refreshing)
    // 07:00 - 13:19 (Morning)
    // 13:20 - 18:00 (Afternoon)
    // ==============================
    const calculateActiveSession = useCallback(() => {
        const now = new Date();
        const totalMinutes = now.getHours() * 60 + now.getMinutes();

        const morningStart = 7 * 60;        // 07:00 AM
        const morningEnd = 13 * 60 + 19;    // 01:19 PM
        const afternoonStart = 13 * 60 + 20; // 01:20 PM
        const afternoonEnd = 18 * 60;       // 06:00 PM

        if (totalMinutes >= morningStart && totalMinutes <= morningEnd) {
            return "Morning";
        } else if (totalMinutes >= afternoonStart && totalMinutes <= afternoonEnd) {
            return "Afternoon";
        }
        return null;
    }, []);

    const [activeSession, setActiveSession] = useState(calculateActiveSession);
    const isSessionActive = Boolean(activeSession);
    const sessionClosedMessage =
        "Attendance is taken only between 07:00 AM - 01:19 PM and 01:20 PM - 06:00 PM.";

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveSession(calculateActiveSession());
        }, 30000); // Check every 30 seconds
        return () => clearInterval(timer);
    }, [calculateActiveSession]);

    // ==============================
    // COMPONENT STATES
    // ==============================
    const [locationStatus, setLocationStatus] = useState("");
    const [locationVerified, setLocationVerified] = useState(false);
    const [loading, setLoading] = useState(false);

    const [faceLoading, setFaceLoading] = useState(false);
    const [faceStatus, setFaceStatus] = useState("");
    const [cameraOpen, setCameraOpen] = useState(false);

    const [attendance, setAttendance] = useState({
        percentage: 0,
        present: 0,
        absent: 0,
        total: 0,
    });

    const webcamRef = useRef(null);

    // ==============================
    // LOAD ATTENDANCE
    // ==============================
    const loadAttendance = useCallback(async () => {
        if (!token) return;

        try {
            const response = await API.get("/attendance/history", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const records =
                response.data?.attendance ||
                response.data?.data?.attendance ||
                response.data?.data ||
                [];

            if (!Array.isArray(records) || records.length === 0) {
                setAttendance({ percentage: 0, present: 0, absent: 0, total: 0 });
                return;
            }

            const presentCount = records.filter((r) => {
                const s = String(r.status || "").toLowerCase();
                return s === "present" || s === "late";
            }).length;

            const absentCount = records.filter(
                (r) => String(r.status || "").toLowerCase() === "absent"
            ).length;

            const totalCount = records.length;
            const percentage =
                totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

            setAttendance({
                percentage,
                present: presentCount,
                absent: absentCount,
                total: totalCount,
            });
        } catch (error) {
            console.error("Attendance loading error:", error);
            setAttendance({ percentage: 0, present: 0, absent: 0, total: 0 });
        }
    }, [token]);

    useEffect(() => {
        loadAttendance();
    }, [loadAttendance]);

    // ==============================
    // EXCEL LOGGING
    // ==============================
    const logAttendanceToExcel = async (recordDetails) => {
        try {
            await API.post("/attendance/log-excel", recordDetails, {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (excelErr) {
            console.warn("Excel logging fallback to localStorage:", excelErr);
            const storedLogs = JSON.parse(
                localStorage.getItem("attendance_excel_records") || "[]"
            );
            storedLogs.push(recordDetails);
            localStorage.setItem(
                "attendance_excel_records",
                JSON.stringify(storedLogs)
            );
        }
    };

    // ==============================
    // LOCATION VERIFICATION
    // ==============================
    const verifyLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus("Geolocation is not supported by your browser.");
            return;
        }

        if (!token) {
            setLocationStatus("Session expired. Please log in again.");
            return;
        }

        setLoading(true);
        setLocationStatus("Detecting GPS coordinates...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    const response = await API.post(
                        "/location/verify",
                        { latitude, longitude, classroom_id: 1 },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (response.data?.success && response.data?.location_verified) {
                        setLocationVerified(true);
                        setLocationStatus(
                            `Location verified. Distance: ${Number(
                                response.data.distance_meters
                            ).toFixed(1)}m`
                        );
                    } else {
                        setLocationVerified(false);
                        setCameraOpen(false);
                        setLocationStatus(
                            response.data?.message || "Outside designated classroom boundary."
                        );
                    }
                } catch (error) {
                    setLocationVerified(false);
                    setCameraOpen(false);
                    setLocationStatus(
                        error.response?.data?.message || "Location verification failed."
                    );
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                setLocationVerified(false);
                setCameraOpen(false);
                setLoading(false);
                const errors = {
                    1: "Location access denied. Please grant permission.",
                    2: "GPS signal unavailable.",
                    3: "Location request timed out. Please retry.",
                };
                setLocationStatus(errors[error.code] || "GPS detection error.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // ==============================
    // FACE VERIFICATION & ATTENDANCE
    // ==============================
    const openFaceVerification = () => {
        setFaceStatus("");
        if (!token) {
            setFaceStatus("Session missing. Please log in.");
            return;
        }
        if (!activeSession) {
            setFaceStatus(sessionClosedMessage);
            return;
        }
        if (!locationVerified) {
            setFaceStatus("Please verify your classroom location first.");
            return;
        }
        setCameraOpen(true);
    };

    const handleCaptureFace = async () => {
        const currentSession = calculateActiveSession();
        if (!currentSession) {
            setFaceStatus(sessionClosedMessage);
            setCameraOpen(false);
            return;
        }

        if (!locationVerified) {
            setFaceStatus("Classroom location verification is required.");
            return;
        }

        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) {
            setFaceStatus("Could not grab camera frame. Check your lighting and camera.");
            return;
        }

        setFaceLoading(true);
        setFaceStatus("Analyzing face & anti-spoofing check...");

        try {
            const blob = dataURLtoBlob(imageSrc);
            const formData = new FormData();
            formData.append("file", blob, "webcam-face.jpg");

            const faceResponse = await API.post("/face/verify", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            const faceResult = faceResponse.data?.data || faceResponse.data;

            if (!faceResult.success || !faceResult.face_verified) {
                setFaceStatus(faceResult.message || "Face could not be verified.");
                setFaceLoading(false);
                return;
            }

            // Match detected identity against current authenticated session
            const detectedId = String(
                faceResult.student_id ?? faceResult.studentId ?? ""
            ).trim().toLowerCase();

            const loggedInId = String(
                student.student_id ?? student.studentId ?? ""
            ).trim().toLowerCase();

            if (detectedId !== loggedInId) {
                console.warn(`ID Mismatch -> Detected: ${detectedId}, Logged-in: ${loggedInId}`);
                setFaceStatus(
                    `Face matched as student ID "${faceResult.student_id}", which does not match your account (${student.student_id}).`
                );
                setFaceLoading(false);
                return;
            }

            setFaceStatus("Face recognized! Marking attendance...");

            const attendanceResponse = await API.post(
                "/attendance/mark",
                {
                    student_id: student.student_id || student.studentId,
                    session_name: currentSession,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (attendanceResponse.data?.success) {
                setFaceStatus(`Attendance marked for ${currentSession} session.`);

                const now = new Date();
                await logAttendanceToExcel({
                    student_id: student.student_id || student.studentId || "",
                    student_name: student.student_name || "Student",
                    department: student.department || "VRAR",
                    year: student.year || "3",
                    section: student.section || "ALPHA",
                    session: currentSession,
                    status: "Present",
                    date: now.toLocaleDateString(),
                    time: now.toLocaleTimeString(),
                    timestamp: now.toISOString(),
                });

                setCameraOpen(false);
                await loadAttendance();
            } else {
                setFaceStatus(attendanceResponse.data?.message || "Failed to mark attendance.");
            }
        } catch (error) {
            console.error("Verification error:", error);
            setFaceStatus(
                error.response?.data?.message ||
                "Failed to communicate with verification service."
            );
        } finally {
            setFaceLoading(false);
        }
    };

    const logout = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="header-main">
                        <span className="dashboard-label">SMART ATTENDANCE SYSTEM</span>
                        <h1>Student Dashboard</h1>
                        <h2>Welcome, {student.student_name || "Student"}</h2>
                        <p>Manage your attendance, timetable and verification from one place.</p>
                    </div>

                    <div className="header-right">
                        <div className="header-status">
                            <span className="status-dot"></span>
                            <span>System Active</span>
                        </div>

                        <div className="profile-section">
                            <div className="profile-info">
                                <span>{student.student_name || "Student"}</span>
                                <small>{student.student_id || ""}</small>
                            </div>
                            <img
                                src={profilePhoto}
                                alt="Profile"
                                className="profile-photo"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/default-profile.png";
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Info Bar */}
            <div className="student-info">
                <div className="student-info-item">
                    <span>Student ID</span>
                    <strong>{student.student_id || "N/A"}</strong>
                </div>
                <div className="student-info-item">
                    <span>Department</span>
                    <strong>{student.department || "VRAR"}</strong>
                </div>
                <div className="student-info-item">
                    <span>Year</span>
                    <strong>{student.year || "3"}</strong>
                </div>
                <div className="student-info-item">
                    <span>Section</span>
                    <strong>{student.section || "ALPHA"}</strong>
                </div>
            </div>

            {/* Dashboard Cards */}
            <div className="dashboard-grid">
                <AttendanceCard attendance={attendance} />
                <Timetable />
                <Announcements />
            </div>

            {/* Step 1: Location Verification */}
            <div className="verification-section">
                <div className="section-header">
                    <div>
                        <span className="section-label">STEP 1</span>
                        <h2>Classroom Location</h2>
                        <p>Verify that you are physically inside the authorized classroom area.</p>
                    </div>
                    <div className={`verification-badge ${locationVerified ? "verified" : "pending"}`}>
                        {locationVerified ? "✓ Verified" : "● Pending"}
                    </div>
                </div>

                <button
                    className="primary-button"
                    onClick={verifyLocation}
                    disabled={loading}
                >
                    {loading ? "Verifying Location..." : "Verify My Location"}
                </button>

                {locationStatus && (
                    <div className={`location-status ${locationVerified ? "success" : "error"}`}>
                        {locationVerified ? "✓ " : "⚠ "}
                        {locationStatus}
                    </div>
                )}
            </div>

            {/* Step 2: Face Verification */}
            <div className="face-section">
                <div className="section-header">
                    <div>
                        <span className="section-label">STEP 2</span>
                        <h2>Face Verification</h2>
                        <p>Use the live camera to verify your identity and mark attendance.</p>
                    </div>
                    <div
                        className={`verification-badge ${
                            !isSessionActive
                                ? "locked"
                                : locationVerified
                                ? "ready"
                                : "locked"
                        }`}
                    >
                        {!isSessionActive
                            ? "⏰ Inactive Window"
                            : locationVerified
                            ? "✓ Ready"
                            : "🔒 Locked"}
                    </div>
                </div>

                {!isSessionActive && (
                    <div className="face-warning" style={{ margin: "10px 0", color: "#b91c1c" }}>
                        ⏰ {sessionClosedMessage}
                    </div>
                )}

                <button
                    className="primary-button face-button"
                    onClick={openFaceVerification}
                    disabled={!isSessionActive || !locationVerified || faceLoading}
                >
                    {faceLoading
                        ? "Verifying..."
                        : isSessionActive
                        ? `Verify My Face (${activeSession} Session)`
                        : "Face Verification Disabled"}
                </button>

                {locationVerified && !isSessionActive && (
                    <div className="face-warning">
                        ⏰ Outside active attendance windows (07:00-13:19 & 13:20-18:00).
                    </div>
                )}

                {!locationVerified && isSessionActive && (
                    <div className="face-warning">
                        🔒 Please verify your classroom location first.
                    </div>
                )}

                {/* Webcam Modal/View */}
                {cameraOpen && (
                    <div className="webcam-container">
                        <div className="camera-header">
                            <div>
                                <span className="camera-live">● LIVE CAMERA</span>
                                <h3>Face Verification</h3>
                            </div>
                        </div>

                        <p className="camera-instruction">
                            Look directly into the camera in a well-lit area. Remove hats or face coverings.
                        </p>

                        <div className="camera-frame">
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                screenshotQuality={1}
                                minScreenshotWidth={640}
                                minScreenshotHeight={480}
                                videoConstraints={{
                                    width: { ideal: 640 },
                                    height: { ideal: 480 },
                                    facingMode: "user",
                                }}
                                onUserMedia={() =>
                                    setFaceStatus("Camera ready. Frame your face and click Capture.")
                                }
                                onUserMediaError={(err) => {
                                    console.error("Webcam error:", err);
                                    setFaceStatus("Unable to access camera. Check device permissions.");
                                }}
                            />
                        </div>

                        <div className="camera-buttons">
                            <button
                                className="capture-button"
                                onClick={handleCaptureFace}
                                disabled={faceLoading || !isSessionActive}
                            >
                                {faceLoading ? "Verifying Face..." : "Capture & Verify Face"}
                            </button>
                            <button
                                className="cancel-button"
                                onClick={() => setCameraOpen(false)}
                                disabled={faceLoading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {faceStatus && (
                    <div className={`face-status ${faceStatus.includes("marked") || faceStatus.includes("recognized") ? "success" : ""}`}>
                        {faceStatus}
                    </div>
                )}
            </div>

            {/* Logout */}
            <div className="logout-section">
                <button className="logout-button" onClick={logout}>
                    Logout
                </button>
            </div>
        </div>
    );
}

export default Dashboard;