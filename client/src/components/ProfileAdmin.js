import React, { useState, useEffect } from "react";
import "../styles/ProfileAdmin.css";
import { getApiUrl } from "../config/api";

function ProfileAdmin() {
  const [runners, setRunners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRunners();
  }, []);

  // Grab all the runners except themselves
  const fetchRunners = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(getApiUrl("/api/runners"), {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch runners");
      }

      const data = await response.json();
      setRunners(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Make another user an admin
  const makeAdmin = async (runnerId) => {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(getApiUrl(`/api/make-admin/${runnerId}`), {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update admin status");
      }

      setSuccess(data.message);

      // Update the runner in the list
      setRunners(
        runners.map((runner) =>
          runner.runner_id === runnerId ? data.user : runner
        )
      );
    } catch (err) {
      console.error("Error making admin:", err);
      setError(err.message);
    }
  };

  // Either make an user a leader or remove their leader status
  const toggleLeader = async (runnerId) => {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        getApiUrl(`/api/toggle-leader/${runnerId}`),
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update leader status");
      }

      setSuccess(data.message);

      // Update the runner in the list
      setRunners(
        runners.map((runner) =>
          runner.runner_id === runnerId ? data.user : runner
        )
      );
    } catch (err) {
      console.error("Error toggling leader:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="profile-admin-loading">Loading runners...</div>;
  }

  // Filter runners based on search term, name or email
  const filteredRunners = runners.filter((runner) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = runner.full_name?.toLowerCase().includes(searchLower);
    const emailMatch = runner.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  });

  return (
    <div className="profile-admin-container">
      <h1>Admin Panel - Manage Users</h1>

      {/* Search Bar */}
      <div className="profile-admin-search-container">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="profile-admin-search-input"
        />
      </div>

      {error && <div className="profile-admin-error">{error}</div>}

      {success && <div className="profile-admin-success">{success}</div>}

      {filteredRunners.length === 0 ? (
        <p>No runners match your search.</p>
      ) : (
        <>
          {searchTerm && (
            <p className="profile-admin-search-count">
              Showing {filteredRunners.length} of {runners.length} runners
            </p>
          )}
          <table className="profile-admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Leader</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRunners.map((runner) => (
                <tr key={runner.runner_id}>
                  <td>{runner.full_name}</td>
                  <td>{runner.email}</td>
                  <td>{runner.is_leader ? "Yes" : "No"}</td>
                  <td>{runner.is_admin ? "Yes" : "No"}</td>
                  <td>
                    <div className="profile-admin-actions">
                      <button onClick={() => toggleLeader(runner.runner_id)}>
                        {runner.is_leader ? "Remove Leader" : "Make Leader"}
                      </button>
                      {!runner.is_admin ? (
                        <button onClick={() => makeAdmin(runner.runner_id)}>
                          Make Admin
                        </button>
                      ) : (
                        <span className="profile-admin-admin-text">
                          Admin (cannot revoke)
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default ProfileAdmin;
