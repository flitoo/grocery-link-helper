import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/AppHeader";
import "./Login.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Login failed. Please try again."
        );
        return;
      }

      // Save authentication token
      localStorage.setItem(
        "token",
        data.token
      );

      // Save logged-in user
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      navigate("/dashboard");
    } catch (err) {
      console.error(
        "Login request failed:",
        err
      );

      setError(
        "Could not reach the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <BrandMark />
          <h1>Groceries from the store you choose, delivered by a helper nearby.</h1>
          <p>
            Make a list, pick a time that suits you, and we handle the
            shopping and the carry.
          </p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <h2>Log in</h2>
          <p className="auth-sub">
            Welcome back. Pick up where you left off.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            <div className="auth-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <p>
                New here? <Link to="/register">Create an account</Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Login;