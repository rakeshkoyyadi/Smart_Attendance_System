import { useState } from "react";
import API from "../services/api";

function Login() {

    const [studentId, setStudentId] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {

        e.preventDefault();

        setMessage("");
        setLoading(true);

        try {

            const response = await API.post(
                "/auth/login",
                {
                    student_id: studentId,
                    password: password
                }
            );

            console.log("Login Response:", response.data);

            if (response.data.success) {

                localStorage.setItem(
                    "token",
                    response.data.token
                );

                if (response.data.student) {

                    localStorage.setItem(
                        "student",
                        JSON.stringify(response.data.student)
                    );
                }

                setMessage("Login successful!");

                window.location.href = "/dashboard";

            } else {

                setMessage(
                    response.data.message ||
                    "Login failed"
                );
            }

        } catch (error) {

            console.error("Login Error:", error);

            setMessage(
                error.response?.data?.message ||
                "Unable to connect to server"
            );

        } finally {

            setLoading(false);
        }
    };

    return (

        <div className="login-container">

            <div className="login-box">

                <div className="login-icon">
                    🎓
                </div>

                <h1>Smart Attendance</h1>

                <p className="login-subtitle">
                    Student Attendance System
                </p>

                <h2>Welcome</h2>

                <p className="login-description">
                    Login to access your attendance dashboard
                </p>

                <form onSubmit={handleLogin}>

                    <div className="input-group">

                        <label>
                            Student ID
                        </label>

                        <input
                            type="text"
                            placeholder="Enter your Student ID"
                            value={studentId}
                            onChange={(e) =>
                                setStudentId(e.target.value)
                            }
                            required
                        />

                    </div>

                    <div className="input-group">

                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            required
                        />

                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Logging in..."
                            : "Login"}
                    </button>

                </form>

                {message && (

                    <div
                        className={
                            message.includes("successful")
                                ? "login-message success"
                                : "login-message error"
                        }
                    >
                        {message}
                    </div>

                )}

                <div className="login-footer">

                    <span>
                        🔒 Secure Login
                    </span>

                    <span>
                        •
                    </span>

                    <span>
                        Smart Attendance System
                    </span>

                </div>

            </div>

        </div>
    );
}

export default Login;

