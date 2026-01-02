import React, { useState, useEffect } from "react";
import { formatPace } from "../utils/paceFormatters";
import { getStaticMapUrl } from "../utils/mapUtils";
import { convertTo12Hour } from "../utils/timeUtils";
import "../styles/ProfileStatistics.css";
import { getApiUrl } from "../config/api";

function ProfileStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostRecentRunDetails, setMostRecentRunDetails] = useState();

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      // Query that gets data for runners and leaders
      const response = await fetch(getApiUrl("/api/profile-statistics"), {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }

      const data = await response.json();
      setStats(data);

      // Fetch most recent run
      const secondResponse = await fetch(getApiUrl("/api/most-recent-run"), {
        credentials: "include",
      });

      if (secondResponse.ok) {
        const secondData = await secondResponse.json();
        setMostRecentRunDetails(secondData);
      }
    } catch (err) {
      console.error("Error fetching statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-statistics-container">
        <div className="profile-statistics-loading">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="profile-statistics-container">
      {/* General Runner Statistics Section - For Everyone */}
      <div className="profile-statistics-section">
        <h2 className="profile-statistics-section-title">Running Statistics</h2>
        <div className="profile-statistics-note">
          * All statistics shown are for completed runs only
        </div>
        <div className="profile-statistics-grid">
          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Total Runs</div>
            <div className="profile-statistics-value">
              {stats.total_runs || 0}
            </div>
            <div className="profile-statistics-description">
              Completed runs you've hosted or joined
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Total Distance</div>
            <div className="profile-statistics-value">
              {stats.total_distance
                ? `${parseFloat(stats.total_distance).toFixed(2)} mi`
                : "0.00 mi"}
            </div>
            <div className="profile-statistics-description">
              Total miles from completed runs
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Average Pace</div>
            <div className="profile-statistics-value">
              {stats.average_pace && stats.average_pace > 0
                ? formatPace(Math.round(stats.average_pace))
                : "--:--"}
            </div>
            <div className="profile-statistics-description">
              Average pace from completed runs
            </div>
          </div>

          <div className="profile-statistics-card">
            <div className="profile-statistics-label">Fastest Pace</div>
            <div className="profile-statistics-value">
              {stats.fastest_pace ? formatPace(stats.fastest_pace) : "--:--"}
            </div>
            <div className="profile-statistics-description">
              Best pace from completed runs
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
              Longest distance from completed runs
            </div>
          </div>
        </div>
      </div>

      {/* Most Recent Run Section */}
      {mostRecentRunDetails && (
        <div className="profile-statistics-section">
          <h2 className="profile-statistics-section-title">Most Recent Run</h2>
          <div className="profile-statistics-recent-run">
            <div className="profile-statistics-recent-run-map">
              <img
                src={getStaticMapUrl(mostRecentRunDetails)}
                alt="Route map"
                className="profile-statistics-map-image"
              />
            </div>
            <div className="profile-statistics-recent-run-info">
              <h3 className="profile-statistics-recent-run-name">
                {mostRecentRunDetails.name}
              </h3>
              <div className="profile-statistics-recent-run-details">
                <div className="profile-statistics-recent-run-detail">
                  <span className="profile-statistics-recent-run-label">
                    Date:
                  </span>
                  <span className="profile-statistics-recent-run-value">
                    {new Date(mostRecentRunDetails.date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
                <div className="profile-statistics-recent-run-detail">
                  <span className="profile-statistics-recent-run-label">
                    Time:
                  </span>
                  <span className="profile-statistics-recent-run-value">
                    {convertTo12Hour(mostRecentRunDetails.start_time)}
                  </span>
                </div>
                <div className="profile-statistics-recent-run-detail">
                  <span className="profile-statistics-recent-run-label">
                    Distance:
                  </span>
                  <span className="profile-statistics-recent-run-value">
                    {parseFloat(mostRecentRunDetails.distance).toFixed(2)} mi
                  </span>
                </div>
                <div className="profile-statistics-recent-run-detail">
                  <span className="profile-statistics-recent-run-label">
                    Pace:
                  </span>
                  <span className="profile-statistics-recent-run-value">
                    {formatPace(mostRecentRunDetails.pace)} / mile
                  </span>
                </div>
              </div>
              <div className="profile-statistics-recent-run-description">
                {mostRecentRunDetails.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileStatistics;
