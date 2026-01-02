import { React, useState } from "react";
import "../styles/ChangePassword.css";
import { getApiUrl } from "../config/api";

/**
 * Component to change user password
 * Validates password match, length, and uniqueness before sending to server
 */
const PASSWORD_MIN_LENGTH = 6;

function ChangePassword({ onNavigateBack }) {
  const [oldPassword, setOldPassword] = useState("");
  const [firstNewPassword, setFirstNewPassword] = useState("");
  const [secondNewPassword, setSecondNewPassword] = useState("");
  const [seePassword, setSeePassword] = useState(false);
  const [error, setError] = useState("");

  const passwordType = seePassword ? "text" : "password";

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError(""); // Clear previous errors

    // Verify that both new passwords match
    if (firstNewPassword !== secondNewPassword) {
      setError("New passwords do not match");
      return;
    }

    // Validate new password length
    if (firstNewPassword.length < PASSWORD_MIN_LENGTH) {
      setError(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
      );
      return;
    }

    // Validate new password != the old password
    if (oldPassword === firstNewPassword) {
      setError("New password cannot match the old password");
      return;
    }

    // Make API call to change password
    try {
      const response = await fetch(getApiUrl("/api/edit-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: firstNewPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to change password");
      }

      // Success - navigate back to details page
      alert("Password changed successfully!");
      if (onNavigateBack) {
        onNavigateBack();
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setError(error.message || "Failed to change password. Please try again.");
    }
  };

  return (
    <div className="change-password-container">
      <h2 className="change-password-title">Change Password</h2>
      <form onSubmit={handleSubmit} className="change-password-container">
        <div className="change-password-row">
          <label>Old Password</label>
          <input
            type={passwordType}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
        </div>

        <div className="change-password-row">
          <label>New Password</label>
          <input
            type={passwordType}
            value={firstNewPassword}
            onChange={(e) => setFirstNewPassword(e.target.value)}
            required
          />
        </div>

        <div className="change-password-row">
          <label>Re-Enter New Password</label>
          <input
            type={passwordType}
            value={secondNewPassword}
            onChange={(e) => setSecondNewPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="button"
          className="change-password-button"
          onClick={() => setSeePassword(!seePassword)}
        >
          {seePassword ? "Hide Password" : "Show Password"}
        </button>
        <button type="submit" className="change-password-submit-button">
          Submit
        </button>
        {error && <div className="change-password-error">{error}</div>}
      </form>
    </div>
  );
}

export default ChangePassword;
