import { API_BASE } from '../lib/api';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";



function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Customer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      const account = data.user;
      const userId = Number(account?.id ?? account?.user_id);

      if (!data.token || !Number.isInteger(userId) || userId <= 0 || !account?.role) {
        setError("Registration response is missing user information. Please log in.");
        return;
      }

      // Save the session the same way Login does, replacing any previous user,
      // so order screens read this account's id.
      const savedUser = { ...account, id: userId, user_id: userId };
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(savedUser));
      localStorage.removeItem("customerId");
      navigate(account.role === "Helper" ? "/helper-dashboard" : "/dashboard");
    } catch (err) {
      console.error("Register request failed:", err);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h1>Grocery Link Helper</h1>
        <h2>Register</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="role">Account Type</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Customer">Customer</option>
              <option value="Helper">Delivery Helper (local demo only)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>

          <p className="login-link">
            Already have an account?{" "}
            <Link to="/">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
