const express = require("express");
const router = express.Router();
const db = require("../connection");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../auth");

const MAX_DISTANCE_MILES = 3;
const JWT_SECRET = process.env.JWT_SECRET;

// GET all runs with optional filtering
router.get("/api/runs", (req, res) => {
  const {
    paceMin,
    paceMax,
    distanceMin,
    distanceMax,
    dateFrom,
    dateTo,
    searchLeader,
    searchName,
    lat,
    lng,
  } = req.query;

  let userPreferences = null;
  const token = req.cookies?.CMIYC;
  if (token && JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userPreferences = {
        min_pace: decoded.min_pace,
        max_pace: decoded.max_pace,
        min_dist_pref: decoded.min_dist_pref,
        max_dist_pref: decoded.max_dist_pref,
      };
    } catch (err) {
      userPreferences = null;
    }
  }

  let sql = `
    SELECT
      r.run_id,
      r.leader_id,
      r.run_route,
      r.name,
      r.description,
      r.pace,
      DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
      TIME_FORMAT(r.start_time, '%l:%i %p') AS start_time,
      rt.start_lat,
      rt.start_lng,
      rt.end_lat,
      rt.end_lng,
      rt.start_address,
      rt.end_address,
      rt.polyline,
      rt.distance,
      CONCAT(leader.first_name, ' ', leader.last_name) AS leader_name
    FROM runs r
    JOIN routes rt ON r.run_route = rt.route_id
    JOIN runners leader ON r.leader_id = leader.runner_id
  `;

  const conditions = [];
  const params = [];

  const effectivePaceMin = paceMin || userPreferences?.min_pace;
  const effectivePaceMax = paceMax || userPreferences?.max_pace;

  if (effectivePaceMin !== null && effectivePaceMin !== undefined) {
    conditions.push("r.pace >= ?");
    params.push(parseInt(effectivePaceMin, 10));
  }
  if (effectivePaceMax !== null && effectivePaceMax !== undefined) {
    conditions.push("r.pace <= ?");
    params.push(parseInt(effectivePaceMax, 10));
  }

  const effectiveDistanceMin =
    distanceMin !== undefined ? distanceMin : userPreferences?.min_dist_pref;
  const effectiveDistanceMax =
    distanceMax !== undefined ? distanceMax : userPreferences?.max_dist_pref;

  if (
    effectiveDistanceMin !== null &&
    effectiveDistanceMin !== undefined &&
    effectiveDistanceMin !== ""
  ) {
    conditions.push("rt.distance >= ?");
    params.push(parseFloat(effectiveDistanceMin));
  }
  if (
    effectiveDistanceMax !== null &&
    effectiveDistanceMax !== undefined &&
    effectiveDistanceMax !== ""
  ) {
    conditions.push("rt.distance <= ?");
    params.push(parseFloat(effectiveDistanceMax));
  }

  if (dateFrom) {
    conditions.push("r.date >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("r.date <= ?");
    params.push(dateTo);
  }

  if (searchLeader && searchLeader.trim()) {
    const searchTerm = `%${searchLeader.trim()}%`;
    conditions.push("(leader.first_name LIKE ? OR leader.last_name LIKE ?)");
    params.push(searchTerm, searchTerm);
  }

  if (searchName && searchName.trim()) {
    conditions.push("r.name LIKE ?");
    params.push(`%${searchName.trim()}%`);
  }

  if (lat && lng) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxDistanceKm = MAX_DISTANCE_MILES * 1.609344;

    conditions.push(`(
      6371 * acos(
        cos(radians(?)) *
        cos(radians(rt.start_lat)) *
        cos(radians(rt.start_lng) - radians(?)) +
        sin(radians(?)) *
        sin(radians(rt.start_lat))
      )
    ) <= ?`);
    params.push(userLat, userLng, userLat, maxDistanceKm);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY r.date DESC, r.start_time DESC";

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch runs" });
    }

    res.json(results);
  });
});

// POST: create a new run (leaders only)
router.post("/api/runs", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  const checkLeaderSql = `SELECT is_leader FROM runners WHERE runner_id = ?`;
  db.query(checkLeaderSql, [runnerId], (leaderErr, leaderResults) => {
    if (leaderErr) {
      console.error("Error checking leader status:", leaderErr);
      return res.status(500).json({ error: "Failed to verify leader status" });
    }

    if (leaderResults.length === 0) {
      return res.status(404).json({ error: "Runner not found" });
    }

    if (!leaderResults[0].is_leader) {
      return res.status(403).json({ error: "Only leaders can create runs" });
    }

    const { run_route, name, description, pace, date, start_time } = req.body;

    if (!run_route || !name || pace === undefined || !date || !start_time) {
      return res.status(400).json({ error: "Missing required run fields" });
    }

    const insertRunSql = `
      INSERT INTO runs
        (leader_id, run_route, name, description, pace, date, start_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      runnerId,
      run_route,
      name,
      description || null,
      pace,
      date,
      start_time,
    ];

    db.query(insertRunSql, values, (err, result) => {
      if (err) {
        console.error("Error creating run:", err);
        return res.status(500).json({ error: "Failed to create run" });
      }

      const runId = result.insertId;

      const participationSql = `
        INSERT INTO run_participation (participation_runner_id, participation_run_id)
        VALUES (?, ?)
      `;

      db.query(participationSql, [runnerId, runId], (err) => {
        if (err) {
          console.error("Error adding leader to participation:", err);
        }

        res.status(201).json({
          message: "Run created successfully",
          run_id: runId,
        });
      });
    });
  });
});

// GET all leaders
router.get("/api/leaders", (req, res) => {
  const sql = `
    SELECT 
      runner_id, 
      CONCAT(first_name, ' ', COALESCE(middle_initial, ''), ' ', last_name) AS full_name,
      email
    FROM runners
    WHERE is_leader = TRUE
    ORDER BY last_name, first_name;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Failed to fetch leaders" });
    }

    res.json(results);
  });
});

// PUT update an existing run
router.put("/api/runs/:id", (req, res) => {
  const { id } = req.params;
  const { leader_id, run_route, name, description, pace, date, start_time } =
    req.body;

  if (
    !leader_id &&
    !run_route &&
    !name &&
    !description &&
    !pace &&
    !date &&
    !start_time
  ) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  const updates = [];
  const values = [];

  if (leader_id) {
    updates.push("leader_id = ?");
    values.push(leader_id);
  }
  if (run_route) {
    updates.push("run_route = ?");
    values.push(run_route);
  }
  if (name) {
    updates.push("name = ?");
    values.push(name);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (pace) {
    updates.push("pace = ?");
    values.push(pace);
  }
  if (date) {
    updates.push("date = ?");
    values.push(date);
  }
  if (start_time) {
    updates.push("start_time = ?");
    values.push(start_time);
  }

  values.push(id);

  const sql = `
    UPDATE runs
    SET ${updates.join(", ")}
    WHERE run_id = ?
  `;

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Database update failed:", err);
      return res.status(500).json({ error: "Failed to update run" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Run not found" });
    }

    res.json({
      message: "Run updated successfully",
      run_id: id,
      updated_fields: updates.map((u) => u.split(" = ")[0]),
    });
  });
});

// POST: join a run
router.post("/api/runs/:runId/join", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;
  const { runId } = req.params;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!runId) {
    return res.status(400).json({ error: "Run ID is required" });
  }

  db.query(
    "SELECT run_id FROM runs WHERE run_id = ?",
    [runId],
    (err, result) => {
      if (err) {
        console.error("Error checking run:", err);
        return res.status(500).json({ error: "Failed to verify run" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Run not found" });
      }

      const sql = `
      INSERT IGNORE INTO run_participation (participation_runner_id, participation_run_id)
      VALUES (?, ?)
    `;

      db.query(sql, [runnerId, runId], (partErr, partResult) => {
        if (partErr) {
          console.error("Error joining run:", partErr);
          return res.status(500).json({ error: "Failed to join run" });
        }

        if (partResult.affectedRows === 0) {
          return res
            .status(409)
            .json({ error: "Already participating in this run" });
        }

        res.status(201).json({ message: "Successfully joined run" });
      });
    }
  );
});

// DELETE: leave a run
router.delete("/api/runs/:runId/leave", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;
  const { runId } = req.params;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!runId) {
    return res.status(400).json({ error: "Run ID is required" });
  }

  db.query(
    "SELECT leader_id FROM runs WHERE run_id = ?",
    [runId],
    (err, runResult) => {
      if (err) {
        console.error("Error checking run leader:", err);
        return res.status(500).json({ error: "Failed to verify run" });
      }

      if (runResult.length === 0) {
        return res.status(404).json({ error: "Run not found" });
      }

      if (runResult[0].leader_id === runnerId) {
        return res.status(403).json({
          error: "Run leaders cannot leave their own runs",
        });
      }

      const sql = `
        DELETE FROM run_participation
        WHERE participation_runner_id = ? AND participation_run_id = ?
      `;

      db.query(sql, [runnerId, runId], (err, result) => {
        if (err) {
          console.error("Error leaving run:", err);
          return res.status(500).json({ error: "Failed to leave run" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Participation not found" });
        }

        res.json({ message: "Successfully left run" });
      });
    }
  );
});

// GET user's runs (scheduled or past)
router.get("/api/my-runs", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;
  const { filter, type } = req.query;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  let dateCondition = "";
  if (filter === "scheduled") {
    dateCondition = "AND r.date >= CURDATE()";
  } else if (filter === "past") {
    dateCondition = "AND r.date < CURDATE()";
  }

  let sql = `
    SELECT
      r.run_id,
      r.leader_id,
      r.run_route,
      r.name,
      r.description,
      r.pace,
      DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
      TIME_FORMAT(r.start_time, '%H:%i:%s') AS start_time,
      rt.start_lat,
      rt.start_lng,
      rt.end_lat,
      rt.end_lng,
      rt.start_address,
      rt.end_address,
      rt.polyline,
      rt.distance,
      CONCAT(leader.first_name, ' ', leader.last_name) AS leader_name`;

  if (type === "hosted") {
    sql += `,
      COALESCE(pc.participant_count, 0) AS participant_count
    FROM runs r
    JOIN routes rt ON r.run_route = rt.route_id
    JOIN runners leader ON r.leader_id = leader.runner_id
    LEFT JOIN (
      SELECT participation_run_id, COUNT(*) as participant_count
      FROM run_participation
      GROUP BY participation_run_id
    ) pc ON r.run_id = pc.participation_run_id
    WHERE r.leader_id = ?`;
  } else {
    sql += `
    FROM run_participation rp
    JOIN runs r ON rp.participation_run_id = r.run_id
    JOIN routes rt ON r.run_route = rt.route_id
    JOIN runners leader ON r.leader_id = leader.runner_id
    WHERE rp.participation_runner_id = ?
    AND r.leader_id != ?`;
  }

  sql += `
    ${dateCondition}
    ORDER BY r.date ASC, r.start_time ASC
  `;

  const params = type === "hosted" ? [runnerId] : [runnerId, runnerId];

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Failed to fetch runs" });
    }

    res.json(results);
  });
});

// DELETE a specific run
router.delete("/api/runs/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const runnerId = req.user?.runner_id;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  db.query(
    "SELECT leader_id FROM runs WHERE run_id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("Error checking run leader:", err);
        return res
          .status(500)
          .json({ error: "Failed to verify run ownership" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Run not found" });
      }

      if (result[0].leader_id !== runnerId) {
        return res
          .status(403)
          .json({ error: "Only the run leader can delete the run" });
      }

      db.query(
        "DELETE FROM run_participation WHERE participation_run_id = ?",
        [id],
        (partErr) => {
          if (partErr) {
            console.error("Error deleting participations:", partErr);
            return res
              .status(500)
              .json({ error: "Failed to delete run participations" });
          }

          db.query(
            "DELETE FROM runs WHERE run_id = ?",
            [id],
            (runErr, runResult) => {
              if (runErr) {
                console.error("Error deleting run:", runErr);
                return res.status(500).json({ error: "Failed to delete run" });
              }

              if (runResult.affectedRows === 0) {
                return res.status(404).json({ error: "Run not found" });
              }

              res.json({ message: "Run deleted successfully" });
            }
          );
        }
      );
    }
  );
});

// GET participants for a specific run (leaders only)
router.get("/api/runs/:runId/participants", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;
  const { runId } = req.params;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!runId) {
    return res.status(400).json({ error: "Run ID is required" });
  }

  db.query(
    "SELECT leader_id FROM runs WHERE run_id = ?",
    [runId],
    (err, runResult) => {
      if (err) {
        console.error("Error checking run leader:", err);
        return res
          .status(500)
          .json({ error: "Failed to verify run ownership" });
      }

      if (runResult.length === 0) {
        return res.status(404).json({ error: "Run not found" });
      }

      if (runResult[0].leader_id !== runnerId) {
        return res
          .status(403)
          .json({ error: "Only the run leader can view participants" });
      }

      const sql = `
        SELECT 
          r.runner_id,
          r.first_name,
          r.last_name,
          r.email
        FROM run_participation rp
        JOIN runners r ON rp.participation_runner_id = r.runner_id
        WHERE rp.participation_run_id = ?
        ORDER BY r.first_name, r.last_name
      `;

      db.query(sql, [runId], (participantErr, participants) => {
        if (participantErr) {
          console.error("Error fetching participants:", participantErr);
          return res
            .status(500)
            .json({ error: "Failed to fetch participants" });
        }

        res.json(participants);
      });
    }
  );
});

// DELETE a participant from a run (leaders only)
router.delete(
  "/api/runs/:runId/participants/:participantId",
  verifyToken,
  (req, res) => {
    const runnerId = req.user?.runner_id;
    const { runId, participantId } = req.params;

    if (!runnerId) {
      return res.status(401).json({ error: "Unauthorized: must be logged in" });
    }

    if (!runId || !participantId) {
      return res
        .status(400)
        .json({ error: "Run ID and Participant ID are required" });
    }

    db.query(
      "SELECT leader_id FROM runs WHERE run_id = ?",
      [runId],
      (err, runResult) => {
        if (err) {
          console.error("Error checking run leader:", err);
          return res
            .status(500)
            .json({ error: "Failed to verify run ownership" });
        }

        if (runResult.length === 0) {
          return res.status(404).json({ error: "Run not found" });
        }

        if (runResult[0].leader_id !== runnerId) {
          return res
            .status(403)
            .json({ error: "Only the run leader can remove participants" });
        }

        db.query(
          "DELETE FROM run_participation WHERE participation_run_id = ? AND participation_runner_id = ?",
          [runId, participantId],
          (deleteErr, deleteResult) => {
            if (deleteErr) {
              console.error("Error removing participant:", deleteErr);
              return res
                .status(500)
                .json({ error: "Failed to remove participant" });
            }

            if (deleteResult.affectedRows === 0) {
              return res
                .status(404)
                .json({ error: "Participant not found in this run" });
            }

            res.json({ message: "Participant removed successfully" });
          }
        );
      }
    );
  }
);

module.exports = router;
