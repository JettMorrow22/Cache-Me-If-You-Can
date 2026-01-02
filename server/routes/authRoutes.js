const express = require("express");
const router = express.Router();
const db = require("../connection");
const { signup, login, getPwAndIdFromEmail } = require("../accounts");
const { generateJWT } = require("../auth");
const { normalizeInteger, validateSignupData } = require("../utils/validation");

// Post to check whether the email and password are available for signup
router.post("/signup/check", async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  if (!email) return res.status(400).json({ error: "email required" });

  if (await getPwAndIdFromEmail(email)) {
    return res.status(409).json({ error: "email_exists" });
  }

  return res.json({ available: true });
});

// Post to insert new user into the database
router.post("/signup", async (req, res) => {
  try {
    const {
      first_name: raw_first_name,
      last_name: raw_last_name,
      middle_initial: raw_middle_initial,
      email: raw_email,
      is_leader: raw_is_leader,
      min_pace: raw_min_pace,
      max_pace: raw_max_pace,
      min_dist_pref: raw_min_dist_pref,
      max_dist_pref: raw_max_dist_pref,
      password,
    } = req.body;

    // Validate all input data
    const validationErrors = validateSignupData({
      email: raw_email,
      password,
      first_name: raw_first_name,
      last_name: raw_last_name,
      middle_initial: raw_middle_initial,
      is_leader: raw_is_leader,
      min_pace: raw_min_pace,
      max_pace: raw_max_pace,
      min_dist_pref: raw_min_dist_pref,
      max_dist_pref: raw_max_dist_pref,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      });
    }

    // Normalize and convert types after validation passes
    const runner_data = {
      first_name: String(raw_first_name).trim(),
      last_name: String(raw_last_name).trim(),
      middle_initial: String(raw_middle_initial).trim().charAt(0).toUpperCase(),
      email: String(raw_email).trim().toLowerCase(),
      user_password: null, // gets filled in signup()
      is_leader: !!raw_is_leader,
      min_pace: normalizeInteger(raw_min_pace),
      max_pace: normalizeInteger(raw_max_pace),
      min_dist_pref: normalizeInteger(raw_min_dist_pref),
      max_dist_pref: normalizeInteger(raw_max_dist_pref),
    };

    const runner_id = await signup(runner_data, password);

    if (runner_id === -1) {
      return res.status(409).json({ error: "email already exists" });
    }

    db.query(
      "SELECT runner_id, first_name, last_name, middle_initial, email, is_leader, min_pace, max_pace, min_dist_pref, max_dist_pref FROM runners WHERE runner_id = ?",
      [runner_id],
      (err, results) => {
        if (err) {
          console.error("Database error fetching user:", err);
          return res.status(500).json({ error: "Server error" });
        }

        if (results.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        const runner = results[0];
        const token = generateJWT(runner);

        res.cookie("CMIYC", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(201).json({ user: runner });
      }
    );
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login - returns user and sets auth cookie
router.post("/login", async (req, res) => {
  try {
    console.log("Login request received from origin:", req.headers.origin);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const result = await login(email, password);
    if (result === -1) {
      return res.status(401).json({ error: "email not found" });
    }
    if (result === -2) {
      return res.status(401).json({ error: "incorrect password" });
    }

    db.query(
      "SELECT runner_id, first_name, last_name, middle_initial, email, is_leader, is_admin, min_pace, max_pace, min_dist_pref, max_dist_pref FROM runners WHERE runner_id = ?",
      [result],
      (err, results) => {
        if (err) {
          console.error("Database error fetching user:", err);
          return res.status(500).json({ error: "Server error" });
        }

        if (results.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        const runner = results[0];
        const token = generateJWT(runner);

        res.cookie("CMIYC", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({
          user: runner,
        });
      }
    );
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
