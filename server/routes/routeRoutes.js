const express = require("express");
const router = express.Router();
const db = require("../connection");
const { verifyToken } = require("../auth");

// POST to insert a new route into database and link it to the logged-in user
router.post("/api/save-route", verifyToken, async (req, res) => {
  const runnerId = req.user?.runner_id;
  const {
    start_lat,
    start_lng,
    end_lat,
    end_lng,
    start_address,
    end_address,
    polyline,
    distance,
  } = req.body;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (
    !start_lat ||
    !start_lng ||
    !end_lat ||
    !end_lng ||
    !polyline ||
    !distance
  ) {
    return res.status(400).json({ error: "Missing required route fields" });
  }

  const insertRouteSql = `
    INSERT INTO routes (start_lat, start_lng, end_lat, end_lng, start_address, end_address, polyline, distance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertRouteSql,
    [
      start_lat,
      start_lng,
      end_lat,
      end_lng,
      start_address || null,
      end_address || null,
      polyline,
      distance,
    ],
    (err, result) => {
      if (err) {
        console.error("/api/save-route error:", err);
        console.error("Error details:", {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage,
          sqlState: err.sqlState,
        });
        console.error("Data being inserted:", {
          start_lat,
          start_lng,
          end_lat,
          end_lng,
          start_address,
          end_address,
          polyline_length: polyline?.length,
          distance,
        });
        return res.status(500).json({
          error: "Failed to save route",
          details:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }

      const newRouteId = result.insertId;

      const linkSql = `
        INSERT INTO saved_routes (runner_id, route_id)
        VALUES (?, ?)
      `;

      db.query(linkSql, [runnerId, newRouteId], (linkErr) => {
        if (linkErr) {
          console.error("Failed to link route to user:", linkErr);
          return res
            .status(500)
            .json({ error: "Route saved, but failed to link to user" });
        }

        res.status(201).json({
          message: "Route saved and linked successfully",
          route_id: newRouteId,
        });
      });
    }
  );
});

// GET saved routes for the logged-in user
router.get("/api/routes", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: no valid user found" });
  }

  const sql = `
    SELECT 
      r.route_id,
      r.start_lat,
      r.start_lng,
      r.end_lat,
      r.end_lng,
      r.start_address,
      r.end_address,
      r.polyline,
      r.distance
    FROM saved_routes sr
    JOIN routes r ON sr.route_id = r.route_id
    WHERE sr.runner_id = ?
    ORDER BY r.route_id DESC;
  `;

  db.query(sql, [runnerId], (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Failed to fetch saved routes" });
    }

    res.json(results);
  });
});

// GET a specific route by ID
router.get("/api/routes/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      route_id,
      start_lat,
      start_lng,
      end_lat,
      end_lng,
      start_address,
      end_address,
      polyline,
      distance
    FROM routes
    WHERE route_id = ?;
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Failed to fetch route" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Route not found" });
    }

    res.json(results[0]);
  });
});

// POST: save a route for the authenticated user
router.post("/api/routes/save/:routeId", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;
  const { routeId } = req.params;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!routeId) {
    return res.status(400).json({ error: "Route ID is required" });
  }

  const sql = `
    INSERT IGNORE INTO saved_routes (runner_id, route_id)
    VALUES (?, ?)
  `;

  db.query(sql, [runnerId, routeId], (err) => {
    if (err) {
      console.error("Failed to save route:", err);
      return res.status(500).json({ error: "Failed to save route" });
    }

    res.status(201).json({ message: "Route saved successfully" });
  });
});

// DELETE: remove a saved route for the authenticated user
router.delete("/api/routes/:routeId", verifyToken, (req, res) => {
  const runnerId = req.user?.runner_id;
  const { routeId } = req.params;

  if (!runnerId) {
    return res.status(401).json({ error: "Unauthorized: must be logged in" });
  }

  if (!routeId) {
    return res.status(400).json({ error: "Route ID is required" });
  }

  // Delete the saved route entry
  const deleteSql = `
      DELETE FROM saved_routes
      WHERE runner_id = ? AND route_id = ?
    `;

  db.query(deleteSql, [runnerId, routeId], (deleteErr) => {
    if (deleteErr) {
      console.error("Failed to delete saved route:", deleteErr);
      return res.status(500).json({ error: "Failed to delete saved route" });
    }

    res.status(200).json({ message: "Saved route deleted successfully" });
  });
});

module.exports = router;
