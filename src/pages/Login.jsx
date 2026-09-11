import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      login(data.token, data.user);
    } catch {
      setError("Could not reach the server.");
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="axis-x"></div>
      <div className="axis-y"></div>

      <div className="login-card panel">
        <div className="login-mark">
          <span className="dot"></span> HOSSAM MATH SESSIONS
        </div>
        <h1>Sign in</h1>
        <p className="sub">Attendance, exams, and payments in one place.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            id="login-btn"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="login-error" id="login-error">
            {error}
          </p>
        </form>
      </div>
    </div>
  );
}
