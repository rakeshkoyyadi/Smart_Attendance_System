
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import "./PasswordAuth.css";

export default function FirstTimePassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await API.post("/auth/email-otp/send", {
        email,
        purpose: "first_time_setup",
      });

      setMessage("OTP sent to your registered email.");
      setStep(2);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await API.post("/auth/email-otp/verify", {
        email,
        otp,
        purpose: "first_time_setup",
      });

      setResetToken(response.data.resetToken);
      setMessage("Email verified. Create your password.");
      setStep(3);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const createPassword = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await API.post("/auth/password/reset", {
        resetToken,
        newPassword: password,
      });

      setMessage("Password created successfully. Redirecting to login...");

      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Unable to create password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-page">
      <div className="password-card">
        <div className="password-icon">🔐</div>

        <h2>First-Time Password Setup</h2>
        <p className="subtitle">
          Verify your registered email to create your account password.
        </p>

        {step === 1 && (
          <form onSubmit={requestOtp}>
            <label>Registered Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your college email"
              required
            />

            <button disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp}>
            <label>Six-Digit OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Enter OTP"
              required
            />

            <button disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setStep(1);
                setOtp("");
                setMessage("");
              }}
            >
              Change Email
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={createPassword}>
            <label>New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />

            <label>Confirm Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />

            <button disabled={loading || !resetToken}>
              {loading ? "Creating Password..." : "Create Password"}
            </button>
          </form>
        )}

        {message && <p className="auth-message">{message}</p>}

        <p className="auth-footer">
          Already have a password? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}