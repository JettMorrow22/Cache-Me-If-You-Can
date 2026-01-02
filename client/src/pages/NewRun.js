import React, { useState, useEffect, useRef } from "react";
import StartTimePicker from "../components/StartTimePicker";
import PaceSlider from "../components/PaceSlider";
import { useNavigate } from "react-router-dom";
import CreateRoute from "./CreateRoute";
import { buildIcons } from "../utils/map/icons";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import { polylineOptions } from "../utils/map/directions";
import polyline from "@mapbox/polyline";
import { useAuth } from "../context/AuthContext";
import "../styles/NewRun.css";
import { getApiUrl } from "../config/api";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_LIBRARIES = ["places", "geometry"];

function NewRun() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [customIcons, setCustomIcons] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState({
    run_route: "",
    name: "",
    description: "",
    pace: "",
    date: "",
    start_time: "",
  });
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [creatingRoute, setCreatingRoute] = useState(false);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Redirect non-leaders
  useEffect(() => {
    if (!loading) {
      if (!user || (user.is_leader !== 1 && user.is_leader !== true)) {
        navigate("/runfinder");
      }
    }
  }, [user, loading, navigate]);

  // Fetch available routes
  useEffect(() => {
    fetch(getApiUrl("/api/routes"), {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setRoutes(data))
      .catch((err) => console.error("Failed to fetch routes:", err));
  }, []);

  // Update the map to fit the route when the selected route updates
  useEffect(() => {
    if (!mapRef.current || !selectedRoute?.polyline) return;

    try {
      const decodedPath = polyline
        .decode(selectedRoute.polyline)
        .map(([lat, lng]) => ({ lat, lng }));

      const bounds = new window.google.maps.LatLngBounds();
      decodedPath.forEach((point) => {
        bounds.extend(point);
      });
      // Also include start and end markers in bounds
      bounds.extend({
        lat: parseFloat(selectedRoute.start_lat),
        lng: parseFloat(selectedRoute.start_lng),
      });
      bounds.extend({
        lat: parseFloat(selectedRoute.end_lat),
        lng: parseFloat(selectedRoute.end_lng),
      });
      mapRef.current.fitBounds(bounds);
    } catch (err) {
      console.error("Error fitting bounds:", err);
    }
  }, [selectedRoute]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const fetchRouteDetails = async (routeId) => {
    try {
      const res = await fetch(getApiUrl(`/api/routes/${routeId}`));
      if (!res.ok) throw new Error("Failed to fetch route details");
      const data = await res.json();
      setSelectedRoute(data);
    } catch (err) {
      console.error(err);
      setSelectedRoute(null);
    }
  };

  const validateForm = () => {
    const missingFields = [];

    if (!form.run_route) missingFields.push("Route");
    if (!form.name.trim()) missingFields.push("Name");
    if (!form.pace) missingFields.push("Pace");
    if (!form.date) missingFields.push("Date");
    if (!form.start_time) missingFields.push("Start Time");

    return missingFields;
  };

  const isFormComplete =
    form.run_route &&
    form.name.trim() &&
    form.pace &&
    form.date &&
    form.start_time;

  const handleSubmit = (e) => {
    e.preventDefault();
    const missing = validateForm();
    if (missing.length > 0) {
      alert(
        `Please complete all required fields before creating the run:\n\n${missing.join(
          ", "
        )}`
      );
      return;
    }

    fetch(getApiUrl("/api/runs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create run");
        return res.json();
      })
      .then(() => {
        alert("Run created successfully!");
        navigate("/runfinder");
      })
      .catch((err) => {
        console.error(err);
        alert("Error creating run.");
      });
  };

  const loadIcons = () => {
    const icons = buildIcons(window.google);
    if (icons) setCustomIcons(icons);
  };

  if (loading) return <p>Loading...</p>;

  if (!user || (user.is_leader !== 1 && user.is_leader !== true)) {
    navigate("/runfinder");
    return <p>Access denied. Only leaders can create new runs.</p>;
  }

  return (
    <div className="new-run-container">
      <div className="new-run-card">
        <h1 className="new-run-title">Create New Run</h1>

        <form onSubmit={handleSubmit} className="new-run-form">
          {/* Route Section */}
          <div className="new-run-route-section">
            <label className="new-run-label">Route</label>
            {creatingRoute ? (
              <div>
                <h3 className="new-run-route-title">Create a New Route</h3>
                <CreateRoute
                  isLoaded={isLoaded}
                  onRouteCreated={(routeId) => {
                    setForm((prev) => ({ ...prev, run_route: routeId }));
                    setCreatingRoute(false);
                    fetchRouteDetails(routeId);
                    alert(`New route created! Route #${routeId} selected.`);
                  }}
                />
              </div>
            ) : (
              <>
                <select
                  name="run_route"
                  value={form.run_route || ""}
                  onChange={(e) => {
                    handleChange(e);
                    const routeId = e.target.value;
                    if (routeId) fetchRouteDetails(routeId);
                  }}
                  className="new-run-select"
                >
                  <option value="">Select an existing route</option>
                  {routes.map((route) => {
                    let displayName = `Route #${route.route_id} (${route.distance} mi)`;
                    if (route.start_address)
                      displayName += `, Start: ${route.start_address}`;
                    if (route.end_address)
                      displayName += `, End: ${route.end_address}`;
                    return (
                      <option key={route.route_id} value={route.route_id}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => setCreatingRoute(true)}
                  className="new-run-secondary-button"
                >
                  + Create New Route
                </button>
              </>
            )}
          </div>

          {/* Map Preview */}
          {isLoaded && selectedRoute && (
            <div className="new-run-map-preview">
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={{
                  lat:
                    (parseFloat(selectedRoute.start_lat) +
                      parseFloat(selectedRoute.end_lat)) /
                    2,
                  lng:
                    (parseFloat(selectedRoute.start_lng) +
                      parseFloat(selectedRoute.end_lng)) /
                    2,
                }}
                zoom={13}
                options={{
                  streetViewControl: false,
                  fullscreenControl: false,
                  draggableCursor: "default",
                  draggingCursor: "grab",
                }}
                onLoad={(map) => {
                  // We have to call this here to ensure google maps is fully loaded
                  map.setMapTypeId("hybrid");
                  loadIcons();
                  mapRef.current = map;
                }}
              >
                <Marker
                  position={{
                    lat: parseFloat(selectedRoute.start_lat),
                    lng: parseFloat(selectedRoute.start_lng),
                  }}
                  icon={customIcons?.startIcon}
                />
                <Marker
                  position={{
                    lat: parseFloat(selectedRoute.end_lat),
                    lng: parseFloat(selectedRoute.end_lng),
                  }}
                  icon={customIcons?.endIcon}
                />
                {selectedRoute.polyline && (
                  <Polyline
                    path={polyline
                      .decode(selectedRoute.polyline)
                      .map(([lat, lng]) => ({ lat, lng }))}
                    options={polylineOptions}
                  />
                )}
              </GoogleMap>
            </div>
          )}

          {/* Other Fields */}
          <div className="new-run-pace-container">
            <PaceSlider
              label="Pace (min:sec per mile)"
              value={form.pace}
              defaultValue={480}
              onChange={(newPace) =>
                setForm((prev) => ({ ...prev, pace: newPace }))
              }
            />
          </div>

          <label className="new-run-label">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="new-run-input"
          />

          <label className="new-run-label">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="new-run-textarea"
          />

          <div className="new-run-row">
            <div className="new-run-column">
              <label className="new-run-label">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
                className="new-run-input"
              />
            </div>

            <StartTimePicker form={form} setForm={setForm} />
          </div>

          <button
            type="submit"
            className="new-run-primary-button"
            disabled={!isFormComplete}
          >
            Create Run
          </button>
        </form>
      </div>
    </div>
  );
}

export default NewRun;
