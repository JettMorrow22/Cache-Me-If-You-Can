import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import PaceSlider from "./PaceSlider";
import { formatPace } from "../utils/paceFormatters";
import { useNavigate } from "react-router-dom";
import "../styles/ProfileDetails.css";
import { getApiUrl } from "../config/api";
/*
  I want to show all the fields of the runner

  Edit Account: user is able to change fields
  There is cancel and save

  We have to check email and password if they are changed

*/
function ProfileDetails({ onNavigateToPassword }) {
  const navigate = useNavigate();
  const { user, updateUserDetails, isLeader, logout } = useAuth();

  const [firstName, setFirstName] = useState(user.first_name);
  const [middleInitial, setMiddleInitial] = useState(user.middle_initial);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email);
  const [minPace, setMinPace] = useState(user.min_pace);
  const [maxPace, setMaxPace] = useState(user.max_pace);
  const [minDistance, setMinDistance] = useState(user.min_dist_pref);
  const [maxDistance, setMaxDistance] = useState(user.max_dist_pref);

  const [isEditing, setIsEditing] = useState(false);

  // set fields back to the value of the cookie
  const cancelEditing = () => {
    setFirstName(user.first_name);
    setMiddleInitial(user.middle_initial);
    setLastName(user.last_name);
    setEmail(user.email);
    // isLeader is not editable, so no need to reset it
    setMinPace(user.min_pace);
    setMaxPace(user.max_pace);
    setMinDistance(user.min_dist_pref);
    setMaxDistance(user.max_dist_pref);
    setIsEditing(false);
  };

  // Check if the user made any changes to their account when editing
  const getChangedFields = () => {
    const changes = {};
    if (firstName !== user.first_name) changes.first_name = firstName;
    if (middleInitial !== user.middle_initial)
      changes.middle_initial = middleInitial;
    if (lastName !== user.last_name) changes.last_name = lastName;
    if (email !== user.email) changes.email = email;
    // isLeader is not editable, so it's not included in changes
    if (minPace !== user.min_pace) changes.min_pace = minPace;
    if (maxPace !== user.max_pace) changes.max_pace = maxPace;
    if (minDistance !== user.min_dist_pref) changes.min_dist_pref = minDistance;
    if (maxDistance !== user.max_dist_pref) changes.max_dist_pref = maxDistance;
    return changes;
  };

  // Attempts to update runner's columns with whatever the user edited
  const handleSave = async () => {
    const changes = getChangedFields();
    if (Object.keys(changes).length === 0) {
      alert("No changes to save");
      setIsEditing(false);
      return;
    }

    try {
      // Make your API call here to update the user
      const response = await fetch(getApiUrl("/api/edit-profile"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(changes),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      }

      // Update the user in AuthContext
      updateUserDetails(result.user);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error || "Failed to update profile. Please try again.");
    }
  };

  // Sets the main component in Profile.js to 'password' to load the
  // ChangePassword.js component
  const clickChangePassword = () => {
    if (onNavigateToPassword) {
      onNavigateToPassword();
    }
  };

  // Logout using AuthContext
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  /*
    I should make signup and this edit use the same input boxes
    because it has the same checks and stuff
  */
  return (
    <div className="profile-details-container">
      {/* Action Buttons */}
      <div className="profile-details-button-container">
        {!isEditing && (
          <button
            className="profile-details-button"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </button>
        )}
        {isEditing && (
          <>
            <button className="profile-details-button" onClick={cancelEditing}>
              Cancel
            </button>
            <button className="profile-details-button" onClick={handleSave}>
              Save Changes
            </button>
          </>
        )}
        <button
          className="profile-details-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {/* Personal Information Section */}
      <div className="profile-details-section">
        <h2 className="profile-details-section-title">Personal Information</h2>
        <div className="profile-details-row">
          <div className="profile-details-field">
            <label className="profile-details-field-label">First Name</label>
            {isEditing ? (
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="profile-details-input"
              />
            ) : (
              <div className="profile-details-value-display">{firstName}</div>
            )}
          </div>
          <div className="profile-details-field">
            <label className="profile-details-field-label">
              Middle Initial
            </label>
            {isEditing ? (
              <input
                type="text"
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value)}
                className="profile-details-input"
                maxLength={1}
              />
            ) : (
              <div className="profile-details-value-display">
                {middleInitial || "-"}
              </div>
            )}
          </div>
          <div className="profile-details-field">
            <label className="profile-details-field-label">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="profile-details-input"
              />
            ) : (
              <div className="profile-details-value-display">{lastName}</div>
            )}
          </div>
        </div>
      </div>

      {/* Account Information Section */}
      <div className="profile-details-section">
        <h2 className="profile-details-section-title">Account Information</h2>
        <div className="profile-details-row">
          <div className="profile-details-field">
            <label className="profile-details-field-label">Email</label>
            {isEditing ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="profile-details-input"
              />
            ) : (
              <div className="profile-details-value-display">{email}</div>
            )}
          </div>
          <div className="profile-details-field">
            <label className="profile-details-field-label">Password</label>
            <button
              className="profile-details-button"
              onClick={clickChangePassword}
            >
              Change Password
            </button>
          </div>
          <div className="profile-details-field">
            <label className="profile-details-field-label">Leader Status</label>
            <div className="profile-details-value-display">
              {isLeader ? "Yes" : "No"}
            </div>
          </div>
        </div>
      </div>

      {/* Running Preferences Section */}
      <div className="profile-details-section">
        <h2 className="profile-details-section-title">Running Preferences</h2>
        <div className="profile-details-row">
          <div className="profile-details-field profile-details-field-wide">
            <label className="profile-details-field-label">
              Min Pace (per mile)
            </label>
            {isEditing ? (
              <PaceSlider
                label=""
                value={minPace || ""}
                onChange={setMinPace}
                defaultValue={240}
              />
            ) : (
              <div className="profile-details-value-display">
                {minPace ? formatPace(minPace) : "--:--"}
              </div>
            )}
          </div>
          <div className="profile-details-field profile-details-field-wide">
            <label className="profile-details-field-label">
              Max Pace (per mile)
            </label>
            {isEditing ? (
              <PaceSlider
                label=""
                value={maxPace || ""}
                onChange={setMaxPace}
                defaultValue={900}
              />
            ) : (
              <div className="profile-details-value-display">
                {maxPace ? formatPace(maxPace) : "--:--"}
              </div>
            )}
          </div>
        </div>
        <div className="profile-details-row">
          <div className="profile-details-field">
            <label className="profile-details-field-label">
              Min Distance (miles)
            </label>
            {isEditing ? (
              <input
                type="number"
                min="0"
                step="1"
                value={minDistance}
                onChange={(e) => setMinDistance(parseInt(e.target.value) || 0)}
                className="profile-details-input"
              />
            ) : (
              <div className="profile-details-value-display">{minDistance}</div>
            )}
          </div>
          <div className="profile-details-field">
            <label className="profile-details-field-label">
              Max Distance (miles)
            </label>
            {isEditing ? (
              <input
                type="number"
                min="0"
                step="1"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value) || 0)}
                className="profile-details-input"
              />
            ) : (
              <div className="profile-details-value-display">{maxDistance}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileDetails;
