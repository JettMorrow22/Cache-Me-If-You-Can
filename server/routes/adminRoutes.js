const express = require("express");
const router = express.Router();
const db = require("../connection");
const { verifyToken } = require("../auth");

// GET all runners (admin only)
router.get("/api/runners", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!req.user.is_admin) {
    return res
      .status(403)
      .json({ error: "Unauthorized: user is not an admin" });
  }

  const sql = `SELECT
    runner_id,
    CONCAT(first_name, ' ', COALESCE(middle_initial, ''), ' ', last_name) AS full_name,
    email,
    is_leader,
    is_admin
    FROM runners
    WHERE runner_id <> ?
    ORDER BY last_name, first_name;`;

  db.query(sql, [runnerId], (err, queryResults) => {
    if (err) {
      console.error("Database query failed for runners:", err);
      return res.status(500).json({ error: "Failed to fetch runners info" });
    }

    res.json(queryResults);
  });
});

//Make runner an admin (only grants admin status, cannot revoke)
router.put("/api/make-admin/:newAdminID", verifyToken, (req, res) => {
  const { newAdminID } = req.params;
  const runnerId = req.user?.runner_id;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!req.user.is_admin) {
    return res
      .status(403)
      .json({ error: "Unauthorized: user is not an admin" });
  }

  const updateSql = `UPDATE runners SET is_admin = 1 WHERE runner_id = ?`;
  db.query(updateSql, [newAdminID], (updateErr) => {
    if (updateErr) {
      console.error("Database update failed:", updateErr);
      return res.status(500).json({ error: "Failed to update admin status" });
    }

    const getUpdatedSql = `select 
      runner_id, 
      CONCAT(first_name, ' ', COALESCE(middle_initial, ''), ' ', last_name) AS full_name, 
      email, 
      is_leader, 
      is_admin 
      from runners
      where runner_id = ?;`;

    db.query(getUpdatedSql, [newAdminID], (fetchErr, fetchResults) => {
      if (fetchErr) {
        console.error("Database query failed:", fetchErr);
        return res
          .status(500)
          .json({ error: "Admin status updated but failed to fetch user" });
      }

      res.json({
        message: "User promoted to admin successfully",
        user: fetchResults[0],
      });
    });
  });
});

//Toggle leader status for a user (admin only)
router.put("/api/toggle-leader/:targetRunnerId", verifyToken, (req, res) => {
  const { targetRunnerId } = req.params;
  const runnerId = req.user?.runner_id;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!req.user.is_admin) {
    return res
      .status(403)
      .json({ error: "Unauthorized: user is not an admin" });
  }

  const getStatusSql = `SELECT is_leader FROM runners WHERE runner_id = ?`;
  db.query(getStatusSql, [targetRunnerId], (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Failed to fetch user status" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentLeaderStatus = results[0].is_leader;
    const newLeaderStatus = !currentLeaderStatus;

    const updateSql = `UPDATE runners SET is_leader = ? WHERE runner_id = ?`;
    db.query(updateSql, [newLeaderStatus, targetRunnerId], (updateErr) => {
      if (updateErr) {
        console.error("Database update failed:", updateErr);
        return res
          .status(500)
          .json({ error: "Failed to update leader status" });
      }

      const getUpdatedSql = `SELECT
        runner_id,
        CONCAT(first_name, ' ', COALESCE(middle_initial, ''), ' ', last_name) AS full_name,
        email,
        is_leader,
        is_admin
        FROM runners
        WHERE runner_id = ?`;

      db.query(getUpdatedSql, [targetRunnerId], (fetchErr, fetchResults) => {
        if (fetchErr) {
          console.error("Database query failed:", fetchErr);
          return res.status(500).json({
            error: "Leader status updated but failed to fetch user",
          });
        }

        if (fetchResults.length === 0) {
          return res.status(404).json({ error: "User not found after update" });
        }

        res.json({
          message: `User ${
            newLeaderStatus ? "promoted to" : "removed from"
          } leader successfully`,
          user: fetchResults[0],
        });
      });
    });
  });
});

// GET admin-wide statistics (admin only)
router.get("/api/admin-statistics", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!req.user.is_admin) {
    return res
      .status(403)
      .json({ error: "Unauthorized: user is not an admin" });
  }

  const sql = `
    SELECT
      (SELECT COUNT(*) FROM runs) AS total_runs,
      (SELECT COALESCE(SUM(rt.distance), 0)
         FROM runs r
         JOIN routes rt ON r.run_route = rt.route_id) AS total_distance,
      (SELECT COUNT(*) FROM runners) AS total_users,
      (SELECT COUNT(*) FROM routes) AS total_routes,
      (SELECT MIN(pace) FROM runs) AS fastest_pace,
      (SELECT MAX(rt.distance)
         FROM runs r
         JOIN routes rt ON r.run_route = rt.route_id) AS longest_run,
      (SELECT AVG(rt.distance)
         FROM runs r
         JOIN routes rt ON r.run_route = rt.route_id) AS average_distance;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database query failed for admin statistics:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch admin statistics" });
    }

    const row = results?.[0] || {};
    res.json({
      total_runs: row.total_runs ?? 0,
      total_distance: Number(row.total_distance) || 0,
      total_users: row.total_users ?? 0,
      total_routes: row.total_routes ?? 0,
      fastest_pace: row.fastest_pace ?? null,
      longest_run: row.longest_run ?? null,
      average_distance: row.average_distance ?? null,
    });
  });
});

module.exports = router;
