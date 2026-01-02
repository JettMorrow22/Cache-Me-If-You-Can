const express = require("express");
const router = express.Router();
const axios = require("axios");

// Google Maps API server routes

// Geocode (Convert address to coordinates)
router.get("/api/geocode", async (req, res) => {
  try {
    const address = req.query.address;

    if (!address) return res.status(400).json({ error: "Missing address" });

    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const { data } = await axios.get(url, {
      params: { address, key: process.env.GOOGLE_MAPS_API_KEY },
    });

    res.json(data);
  } catch (err) {
    console.error("/api/geocode error", err.response?.data || err.message);
    res.status(500).json({ error: "Geocode failed" });
  }
});

// Reverse Geocode (convert coordinates to address)
// Google maps address validation API
// Address Validation API expects this json
// where addressLines is ["street address", "city, State, zip code"]
router.get("/api/reverse-geocode", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing lat or lng" });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const { data } = await axios.get(url, {
      params: {
        latlng: `${lat},${lng}`,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });
    res.json(data);
  } catch (err) {
    console.error(
      "/api/reverse-geocode error",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Reverse geocode failed" });
  }
});

// Validate Address
router.post("/api/validate-address", async (req, res) => {
  try {
    const { address, addressLines, regionCode = "US" } = req.body || {};
    const lines = Array.isArray(addressLines)
      ? addressLines
      : typeof address === "string"
      ? [address]
      : [];

    if (!lines.length) {
      return res.status(400).json({ error: "Missing address" });
    }

    const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const body = { address: { regionCode, addressLines: lines } };
    const { data } = await axios.post(url, body);
    res.json(data);
  } catch (err) {
    console.error(
      "/api/validate-address error",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Address validation failed" });
  }
});

// Scenic photos near a city (minimal version)
router.get("/api/scenic-photos", async (req, res) => {
  try {
    const { city, limit = 6 } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey)
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    if (!city) return res.status(400).json({ error: "Missing city parameter" });

    // Geocode city to lat/lng
    const geo = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: { address: city, key: apiKey },
      }
    );

    const locationCoords = geo.data?.results?.[0]?.geometry?.location;
    if (!locationCoords)
      return res.status(400).json({ error: "Could not geocode city" });
    const location = `${locationCoords.lat},${locationCoords.lng}`;

    // Nearby scenic-ish spots
    const nearby = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location,
          radius: 5000,
          keyword: "park trail scenic",
          key: apiKey,
        },
      }
    );

    const exclude = ["florist", "d'rose"];
    const picks = (nearby.data?.results || [])
      .filter((p) => {
        if (!p?.photos?.length) return false;
        const text = `${p.name || ""} ${p.vicinity || ""}`.toLowerCase();
        return !exclude.some((k) => text.includes(k));
      })
      .slice(0, Math.min(Number(limit) || 6, 10))
      .map((p) => ({
        name: p.name,
        vicinity: p.vicinity,
        placeId: p.place_id,
        photoUrl: `/api/scenic-photo?ref=${encodeURIComponent(
          p.photos[0].photo_reference
        )}`,
      }));

    if (!picks.length)
      return res.status(404).json({ error: "No scenic photos found" });
    res.json(picks);
  } catch (err) {
    console.error(
      "/api/scenic-photos error",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Failed to fetch scenic photos" });
  }
});

// Proxy a single scenic photo so referrer restrictions don't block the image
router.get("/api/scenic-photo", async (req, res) => {
  try {
    const { ref, maxwidth = 1200 } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!ref) {
      return res.status(400).json({ error: "Missing ref" });
    }
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${apiKey}`;
    const response = await axios.get(photoUrl, { responseType: "arraybuffer" });

    const contentType = response.headers["content-type"] || "image/jpeg";
    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (err) {
    console.error("/api/scenic-photo error", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch scenic photo" });
  }
});

module.exports = router;
