import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/AppHeader";
import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!email) {
        setMessage("Please enter your email.");
        return;
    }
    setMessage("If this email exists, a password reset link will be sent.");
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <BrandMark />
          <h1>Locked out? It happens.</h1>
          <p>Enter your email and we will send you a reset link.</p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <h2>Reset your password</h2>
          <p className="auth-sub">
            Use the email you signed up with.
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

            {message && (
              <p className="notice notice-info" role="status">
                {message}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block">
              Send reset link
            </button>

            <div className="auth-links">
              <Link to="/">Back to log in</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ForgotPassword;