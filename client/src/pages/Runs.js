// client/src/pages/Runs.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl } from "../config/api";

function Runs() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/runs"), {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch runs:", err);
        setLoading(false);
      });
  }, []);

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this run?")) return;

    fetch(getApiUrl(`/api/runs/${id}`), {
      method: "DELETE",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete run");
        setRuns((prev) => prev.filter((run) => run.run_id !== id));
      })
      .catch((err) => {
        console.error(err);
        alert("Error deleting run.");
      });
  };

  if (loading) return <p style={{ padding: "2rem" }}>Loading runs...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>All Runs</h1>
        <Link
          to="/runs/new"
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          + Create New Run
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
          marginTop: "1.5rem",
        }}
      >
        {runs.map((run) => (
          <div
            key={run.run_id}
            style={{
              position: "relative", // allows positioning delete button
              border: "1px solid #ccc",
              borderRadius: "12px",
              padding: "1rem 1.5rem",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              backgroundColor: "#fdfdfd",
            }}
          >
            {/* Delete button */}
            <button
              onClick={() => handleDelete(run.run_id)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                color: "red",
                fontSize: "1.5rem",
                cursor: "pointer",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ffe6e6",
              }}
              title="Delete run"
            >
              ✕
            </button>

            <h2 style={{ marginBottom: "0.5rem" }}>{run.name}</h2>
            <p>
              <strong>Status:</strong> {run.status}
            </p>
            <p>
              <strong>Leader ID:</strong> {run.leader_id}
            </p>
            <p>
              <strong>Route:</strong> {run.run_route}
            </p>
            <p>
              <strong>Pace:</strong> {run.pace}
            </p>
            <p>
              <strong>Date:</strong> {run.date}
            </p>
            <p>
              <strong>Start Time:</strong> {run.start_time}
            </p>
            <p>{run.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Runs;
