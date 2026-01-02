import React, { useState, useEffect } from "react";
import { formatPace } from "../utils/paceFormatters";
import "../styles/ProfileStatistics.css";
import { getApiUrl } from "../config/api";

function LeaderStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl("/api/profile-statistics"), {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-statistics-section">
        <h2 className="profile-statistics-section-title">Leader Statistics</h2>
        <div>Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="profile-statistics-section">
        <h2 className="profile-statistics-section-title">Leader Statistics</h2>
        <div>Unable to load statistics</div>
      </div>
    );
  }

  return (
    <div className="profile-statistics-section">
      <h2 className="profile-statistics-section-title">Leader Statistics</h2>
      <div className="profile-statistics-grid">
        <div className="profile-statistics-card">
          <div className="profile-statistics-label">Runs Hosted</div>
          <div className="profile-statistics-value">
            {stats.runs_hosted || 0}
          </div>
          <div className="profile-statistics-description">
            Runs you've created and led
          </div>
        </div>

        <div className="profile-statistics-card">
          <div className="profile-statistics-label">Total Participants</div>
          <div className="profile-statistics-value">
            {stats.total_run_participants || 0}
          </div>
          <div className="profile-statistics-description">
            Total people that have joined your runs
          </div>
        </div>

        <div className="profile-statistics-card">
          <div className="profile-statistics-label">Max Participants</div>
          <div className="profile-statistics-value">
            {stats.max_participants || 0}
          </div>
          <div className="profile-statistics-description">
            The most participants you have had join your run
          </div>
        </div>

        <div className="profile-statistics-card">
          <div className="profile-statistics-label">Average Distance</div>
          <div className="profile-statistics-value">
            {stats.avg_hosted_dist
              ? `${parseFloat(stats.avg_hosted_dist).toFixed(2)} mi`
              : "--"}
          </div>
          <div className="profile-statistics-description">
            The average distance of your hosted runs
          </div>
        </div>

        <div className="profile-statistics-card">
          <div className="profile-statistics-label">Average Pace</div>
          <div className="profile-statistics-value">
            {stats.avg_hosted_pace && stats.avg_hosted_pace > 0
              ? formatPace(Math.round(stats.avg_hosted_pace))
              : "--:--"}
          </div>
          <div className="profile-statistics-description">
            The average pace for your hosted runs
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaderStatistics;
