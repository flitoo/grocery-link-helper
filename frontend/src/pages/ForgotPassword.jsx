import { useState } from "react";
import { Link } from "react-router-dom";
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
    <div className="login-page">
      <div className="login-card">
        <h1>Grocery Link Helper</h1>
        <h2>Forgot Password</h2>

        <p>Enter your email to reset your password.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button type="submit">Reset Password</button>
          {message && <p className="error-message">{message}</p>}

          <Link to="/" className="forgot-password">
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;