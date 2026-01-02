import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PaceSlider from "../components/PaceSlider";
import { getApiUrl } from "../config/api";

// Validation constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 6;
const LETTER_REGEX = /^[a-zA-Z]$/;

export default function Signup() {
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Step 1 state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [isLeader, setIsLeader] = useState(false);
  const [minPace, setMinPace] = useState(240);
  const [maxPace, setMaxPace] = useState(900);
  const [minDist, setMinDist] = useState();
  const [maxDist, setMaxDist] = useState();

  // Helper function to validate and convert numeric input
  const parseInteger = (value) => {
    if (value === "") return null;
    const num = Number(value);
    return !isNaN(num) && Number.isInteger(num) ? num : null;
  };

  // Validate step 1 (email and password)
  const validateStep1 = () => {
    const errors = [];
    const normEmail = email.trim().toLowerCase();

    // validate email
    if (!normEmail) {
      errors.push("Email is required");
    } else if (!EMAIL_REGEX.test(normEmail)) {
      errors.push("Please enter a valid email address");
    } else if (normEmail.length > EMAIL_MAX_LENGTH) {
      errors.push(`Email must be ${EMAIL_MAX_LENGTH} characters or less`);
    }

    // validate password
    if (!password) {
      errors.push("Password is required");
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
      );
    }

    return errors;
  };

  // Validate step 2 (additional fields)
  const validateStep2 = () => {
    const errors = [];

    // First and Last name validation
    if (!firstName || firstName.trim() === "") {
      errors.push("First name is required");
    }
    if (!lastName || lastName.trim() === "") {
      errors.push("Last name is required");
    }

    // Middle initial validation
    if (!middleInitial || middleInitial.trim() === "") {
      errors.push("Middle initial is required");
    } else if (!LETTER_REGEX.test(middleInitial)) {
      errors.push("Middle initial must be a single letter");
    }

    // Parse numeric fields
    const minPaceNum = parseInteger(minPace);
    const maxPaceNum = parseInteger(maxPace);
    const minDistNum = parseInteger(minDist);
    const maxDistNum = parseInteger(maxDist);

    // Cross-field validation (only if both values are valid)
    if (minPaceNum !== null && maxPaceNum !== null && minPaceNum > maxPaceNum) {
      errors.push("Min pace cannot be greater than max pace");
    }
    if (minDistNum !== null && maxDistNum !== null && minDistNum > maxDistNum) {
      errors.push("Min distance cannot be greater than max distance");
    }

    return errors;
  };

  const handleStep1Submit = async (event) => {
    event.preventDefault();
    setErr("");

    const validationErrors = validateStep1();
    if (validationErrors.length > 0) {
      return setErr(validationErrors.join(". "));
    }

    const normEmail = email.trim().toLowerCase();

    try {
      const response = await fetch(getApiUrl("/signup/check"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normEmail }),
      });

      if (response.status === 409) {
        return setErr("Email already exists!");
      }
      if (!response.ok) {
        return setErr("Server error. Please try again.");
      }

      // Valid email and password continue to step 2
      setStep(2);
    } catch (error) {
      console.error("Signup check error:", error);
      setErr("Network error. Please try again.");
    }
  };

  const handleStep2Submit = async (event) => {
    event.preventDefault();
    setErr("");

    const validationErrors = validateStep2();
    if (validationErrors.length > 0) {
      return setErr(validationErrors.join(". "));
    }

    // Prepare payload with required fields (validation ensures they're not empty)
    const payload = {
      email: email.trim().toLowerCase(),
      password,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_initial: middleInitial.trim(),
      is_leader: isLeader,
      min_pace: minPace,
      max_pace: maxPace,
      min_dist_pref: parseInteger(minDist),
      max_dist_pref: parseInteger(maxDist),
    };

    try {
      // signup() handles the API call and stores user in context
      // HTTP-only cookie is automatically set by server
      await signup(payload);

      // Redirect to summary page after successful signup
      navigate("/home");
    } catch (error) {
      setErr(error.message || "Signup failed!");
    }
  };

  const handleMiddleInitialChange = (e) => {
    const value = e.target.value;
    if (value === "" || LETTER_REGEX.test(value)) {
      setMiddleInitial(value.toUpperCase());
    }
  };

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
        <h1 style={{ textAlign: "center" }}>Sign up</h1>

        {step === 1 && (
          <form
            onSubmit={handleStep1Submit}
            style={{ display: "grid", gap: 8 }}
          >
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Continue</button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={handleStep2Submit}
            style={{ display: "grid", gap: 8 }}
          >
            <input
              type="text"
              placeholder="First name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Last name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Middle initial"
              required
              maxLength={1}
              value={middleInitial}
              onChange={handleMiddleInitialChange}
            />
            <label>
              <input
                type="checkbox"
                checked={isLeader}
                onChange={(e) => setIsLeader(e.target.checked)}
              />
              Leader?
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <PaceSlider
                label="Min Pace (min:sec per mile)"
                value={minPace || ""}
                onChange={setMinPace}
                defaultValue={240}
              />
              <PaceSlider
                label="Max Pace (min:sec per mile)"
                value={maxPace || ""}
                onChange={setMaxPace}
                defaultValue={900}
              />
              <input
                type="number"
                placeholder="Min distance"
                required
                min="0"
                step="1"
                value={minDist}
                onChange={(e) => setMinDist(e.target.value)}
              />
              <input
                type="number"
                placeholder="Max distance"
                required
                min="0"
                step="1"
                value={maxDist}
                onChange={(e) => setMaxDist(e.target.value)}
              />
            </div>
            <button type="submit">Create account</button>
            <button type="button" onClick={() => setStep(1)}>
              Back
            </button>
          </form>
        )}

        {err && <div style={{ color: "crimson" }}>{err}</div>}
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          If you already have an account, <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
