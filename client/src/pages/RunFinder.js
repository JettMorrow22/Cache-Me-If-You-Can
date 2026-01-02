import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import polyline from "@mapbox/polyline";
import { fetchPublicRuns } from "../services/runService";
import RouteCard from "../components/RouteCard";
import FilterForm from "../components/FilterForm";
import { buildIcons } from "../utils/map/icons";
import { useAuth } from "../context/AuthContext";
import "../styles/RunFinder.css";
import { getApiUrl } from "../config/api";

const mapOptions = {
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: true,
  colorScheme: "DARK",
  styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
};

// Constants
const DEFAULT_LOCATION = { lat: 37.2296, lng: -80.4139 }; // Blacksburg
const GOOGLE_MAPS_LIBRARIES = ["places", "geometry"];

// Helper functions
const getRunCoords = (run) => ({
  lat: parseFloat(run.start_lat),
  lng: parseFloat(run.start_lng),
});

const getRunEndCoords = (run) => ({
  lat: parseFloat(run.end_lat),
  lng: parseFloat(run.end_lng),
});

const saveRoute = async (routeId) => {
  try {
    const response = await fetch(getApiUrl(`/api/routes/save/${routeId}`), {
      method: "POST",
      credentials: "include", // to send HTTP-only cookies
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const data = await response.json();
      alert(`Failed to save route: ${data.error}`);
      return;
    }
    alert("Route saved successfully!");
  } catch (err) {
    console.error("Error saving route:", err);
    alert("Error saving route");
  }
};

function RunFinder() {
  const [runs, setRuns] = useState([]);
  const { user, loading } = useAuth();

  // Google Maps and location state
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchLocationCoords, setSearchLocationCoords] = useState(null);
  const locationAutocompleteRef = useRef(null);
  const [customIcons, setCustomIcons] = useState(null);
  const distanceDefaults = useMemo(
    () => ({
      min: user?.min_dist_pref ?? 0,
      max: user?.max_dist_pref ?? 15,
    }),
    [user]
  );

  // Search filter states - consolidated
  const [filters, setFilters] = useState({
    paceMin: "",
    paceMax: "",
    distanceMin: "",
    distanceMax: "",
    dateFrom: "",
    dateTo: "",
    searchLeader: "",
    searchName: "",
  });

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    onError: () => {
      alert("google maps api not working");
    },
  });

  // Initialize filters with user preferences when user data loads
  useEffect(() => {
    if (user && !loading) {
      setFilters((prevFilters) => ({
        ...prevFilters,
        paceMin: user.min_pace || "",
        paceMax: user.max_pace || "",
        distanceMin:
          user.min_dist_pref !== null && user.min_dist_pref !== undefined
            ? user.min_dist_pref
            : "",
        distanceMax:
          user.max_dist_pref !== null && user.max_dist_pref !== undefined
            ? user.max_dist_pref
            : "",
      }));
    }
  }, [user, loading]);

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setMapCenter(location);
      },
      (error) => {
        console.error("Error getting location:", error);
        setUserLocation(DEFAULT_LOCATION);
        setMapCenter(DEFAULT_LOCATION);
      }
    );
  }, []);

  // Handle location autocomplete selection
  const handleLocationSelect = () => {
    if (locationAutocompleteRef.current) {
      const place = locationAutocompleteRef.current.getPlace();
      if (place && place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setSearchLocationCoords(location);
        setMapCenter(location);
      }
    }
  };

  // Fetch runs from server with filters
  const fetchRuns = useCallback(async () => {
    const data = await fetchPublicRuns(
      filters,
      searchLocationCoords,
      userLocation
    );
    setRuns(data);

    // Always select the first run from results
    const newSelected = data[0] || null;
    setSelectedRun(newSelected);
    if (newSelected) {
      setMapCenter(getRunCoords(newSelected));
    }
  }, [filters, searchLocationCoords, userLocation]);

  // Join a run and remove it from the displayed list
  const joinRun = async (runId) => {
    try {
      const response = await fetch(getApiUrl(`/api/runs/${runId}/join`), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to join run");
        return;
      }

      // Remove the joined run from the list and update selected run if needed
      const wasSelected = selectedRun?.run_id === runId;
      setRuns((prevRuns) => {
        const updatedRuns = prevRuns.filter((run) => run.run_id !== runId);

        // Update selected run if the joined run was selected
        if (wasSelected) {
          const newSelected = updatedRuns[0] || null;
          setSelectedRun(newSelected);
          if (newSelected) {
            setMapCenter(getRunCoords(newSelected));
          } else {
            // If no runs remain, reset map center to user location or default
            setMapCenter(userLocation || DEFAULT_LOCATION);
          }
        }

        return updatedRuns;
      });

      alert("Joined run successfully!");
    } catch (err) {
      console.error("Error joining run:", err);
      alert("Error joining run");
    }
  };

  // Clear all filters - reset to user preferences for pace/distance
  const clearFilters = () => {
    setFilters({
      paceMin: user?.min_pace || "",
      paceMax: user?.max_pace || "",
      distanceMin:
        user?.min_dist_pref !== null && user?.min_dist_pref !== undefined
          ? user.min_dist_pref
          : "",
      distanceMax:
        user?.max_dist_pref !== null && user?.max_dist_pref !== undefined
          ? user.max_dist_pref
          : "",
      dateFrom: "",
      dateTo: "",
      searchLeader: "",
      searchName: "",
    });
    setSearchLocationCoords(null);
  };

  // Fetch runs when filters or location changes
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Handle route card click
  const handleRouteClick = (run) => {
    setSelectedRun(run);
    setMapCenter(getRunCoords(run));
  };

  // Get polyline path for selected run
  const getPolylinePath = (run) => {
    if (!run || !run.polyline) return [];
    const decoded = polyline.decode(run.polyline);
    return decoded.map(([lat, lng]) => ({ lat, lng }));
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div>
        <button onClick={() => setFiltersOpen(!filtersOpen)}>
          Search Filters! {filtersOpen ? "▼" : "▶"}
        </button>
        {filtersOpen && (
          <FilterForm
            filters={filters}
            setFilters={setFilters}
            clearFilters={clearFilters}
            locationAutocompleteRef={locationAutocompleteRef}
            handleLocationSelect={handleLocationSelect}
            setSearchLocationCoords={setSearchLocationCoords}
            distanceDefaults={distanceDefaults}
          />
        )}
      </div>

      <div className="main-content">
        <div>
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={13}
            options={mapOptions}
            onLoad={(map) => {
              const icons = buildIcons(window.google);
              if (icons) setCustomIcons(icons);
            }}
          >
            {searchLocationCoords && window.google && (
              <Marker
                position={searchLocationCoords}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#10b981",
                  fillOpacity: 1,
                  strokeColor: "#fff",
                  strokeWeight: 3,
                }}
              />
            )}
            {userLocation && !searchLocationCoords && window.google && (
              <Marker
                position={userLocation}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#4285F4",
                  fillOpacity: 1,
                  strokeColor: "#fff",
                  strokeWeight: 3,
                }}
              />
            )}
            {selectedRun?.polyline && (
              <Polyline
                path={getPolylinePath(selectedRun)}
                options={{
                  strokeColor: "#2563eb",
                  strokeOpacity: 1,
                  strokeWeight: 10,
                }}
              />
            )}
            {selectedRun && (
              <>
                <Marker
                  position={getRunCoords(selectedRun)}
                  icon={customIcons?.startIcon}
                />
                <Marker
                  position={getRunEndCoords(selectedRun)}
                  icon={customIcons?.endIcon}
                />
              </>
            )}
          </GoogleMap>
        </div>

        <div className="cards-container">
          {runs.length === 0 ? (
            <p>
              {searchLocationCoords || userLocation
                ? "No runs within 3 miles match your search criteria."
                : "No runs match your search criteria."}
            </p>
          ) : (
            runs.length > 0 && (
              <>
                <p>
                  Showing {runs.length} run{runs.length !== 1 ? "s" : ""}
                  {searchLocationCoords || userLocation
                    ? " within 3 miles"
                    : ""}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {runs.map((run) => (
                    <div key={run.run_id}>
                      <RouteCard
                        run={run}
                        isSelected={selectedRun?.run_id === run.run_id}
                        onClick={() => handleRouteClick(run)}
                        user={user}
                        onSaveRoute={saveRoute}
                        onJoinRun={joinRun}
                      />
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default RunFinder;
