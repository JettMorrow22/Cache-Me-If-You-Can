import React, { useEffect, useState } from "react";
import { formatPace } from "../utils/paceFormatters";
import "../styles/ProfileStatistics.css";
import { getApiUrl } from "../config/api";

function AdminStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(getApiUrl("/api/admin-statistics"), {
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch admin statistics");
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching admin statistics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="profile-statistics-container">
        <div className="profile-statistics-loading">
          Loading admin statistics...
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="profile-statistics-container">
        <div className="profile-statistics-loading">
          {error || "Unable to load admin statistics"}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-statistics-container">
      <div className="profile-statistics-section">
        <h2 className="profile-statistics-section-title">Admin Statistics</h2>
        <div className="profile-statistics-grid">
          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Total Runs</div>
            <div className="profile-statistics-value">
              {stats.total_runs || 0}
            </div>
            <div className="profile-statistics-description">
              Runs currently in the database
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Total Miles</div>
            <div className="profile-statistics-value">
              {stats.total_distance
                ? `${parseFloat(stats.total_distance).toFixed(2)} mi`
                : "0.00 mi"}
            </div>
            <div className="profile-statistics-description">
              Sum of distances across all runs
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Total Users</div>
            <div className="profile-statistics-value">
              {stats.total_users || 0}
            </div>
            <div className="profile-statistics-description">
              Accounts currently registered
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Total Routes</div>
            <div className="profile-statistics-value">
              {stats.total_routes || 0}
            </div>
            <div className="profile-statistics-description">
              Routes stored in the database
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Fastest Pace</div>
            <div className="profile-statistics-value">
              {stats.fastest_pace
                ? formatPace(Math.round(stats.fastest_pace))
                : "--:--"}
            </div>
            <div className="profile-statistics-description">
              Quickest posted run pace overall
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Longest Run</div>
            <div className="profile-statistics-value">
              {stats.longest_run
                ? `${parseFloat(stats.longest_run).toFixed(2)} mi`
                : "--"}
            </div>
            <div className="profile-statistics-description">
              Longest distance among all runs
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Average Distance</div>
            <div className="profile-statistics-value">
              {stats.average_distance
                ? `${parseFloat(stats.average_distance).toFixed(2)} mi`
                : "0.00 mi"}
            </div>
            <div className="profile-statistics-description">
              Average distance across all runs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminStatistics;
