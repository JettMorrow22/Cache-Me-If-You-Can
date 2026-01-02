import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();
    setErr("");

    if (!email || !password) {
      return setErr("Email and password are required!");
    }

    try {
      // login() handles the API call and stores user in context
      // HTTP-only cookie is automatically set by server
      await login(email, password);

      // Redirect to summary page for testing
      navigate("/home");
    } catch (error) {
      setErr(error.message || "Sign in failed!");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      <div style={{ display: "grid", gap: 12, maxWidth: 360, width: "100%" }}>
        <h1 style={{ textAlign: "center" }}>Login</h1>
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit">Login</button>
        </form>
        {err && <div style={{ color: "crimson" }}>{err}</div>}
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          If you don't have an account, <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
