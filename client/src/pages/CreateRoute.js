import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  Autocomplete,
  useJsApiLoader,
  Polyline,
} from "@react-google-maps/api";
import { coordinatesToAddress } from "../services/geocoding";
import { routeSave } from "../services/routeSave";
import { buildIcons } from "../utils/map/icons";
import {
  requestDirections,
  extractLegEndpoints,
  polylineOptions,
} from "../utils/map/directions";
import validator from "validator";
import { addEndpoints } from "../utils/map/addEndpoints";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const GOOGLE_MAPS_LIBRARIES = ["places", "geometry"];

/*
  -We have start/end Coords which is the coordinates of the start and end 
   locations that we select on the map.
  -startAddress and endAddress is the address or coordinates used to display
   the address in the input box.
  -Active Pick is used to determine whether we are selecting a start or end 
   location.
  -Directions is the result returend from the google maps route generation given
   startCoords and endCoords
  -RouteStart and RouteEnd is the start and end coordinates of the route 
   returned from the google maps api.

  We select start and end coordinates. We then send this to the google maps api
   to generate a route between these two points. The route returned also has a 
   start and end location. This may not be the same as our start and end so we 
   draw a line between them to make it look fully connected.

*/
const CreateRoute = ({ onRouteCreated, isLoaded: parentIsLoaded }) => {
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [startAddress, setStartAddress] = useState(null);
  const [endAddress, setEndAddress] = useState(null);

  const [activePick, setActivePick] = useState(null);

  const [hasRoute, setHasRoute] = useState(false);
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [customIcons, setCustomIcons] = useState(null);

  const initialCenter = { lat: 37.2296, lng: -80.4139 }; // Blacksburg
  const [mapCenter, setMapCenter] = useState(initialCenter);

  const startAutocompleteRef = useRef(null);
  const endAutocompleteRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const initialDirectionsRef = useRef(null);

  // Check if Google Maps is already loaded (when used as child component)
  const isGoogleMapsAlreadyLoaded =
    typeof window !== "undefined" &&
    window.google &&
    window.google.maps &&
    window.google.maps.places &&
    window.google.maps.geometry;

  // Load Google Maps API only if not already loaded and not provided by parent
  // When used inside NewRun, parentIsLoaded will be provided and Google Maps is already loaded
  const { isLoaded: standaloneIsLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Use parent's isLoaded if provided, or check if already loaded, otherwise use standalone
  const isLoaded =
    parentIsLoaded !== undefined
      ? parentIsLoaded
      : isGoogleMapsAlreadyLoaded || standaloneIsLoaded;

  // Generate route - memoized to prevent unnecessary re-renders
  const generateRoute = useCallback(async () => {
    if (!isLoaded) return; // Don't try to generate route if Google Maps isn't loaded
    try {
      const result = await requestDirections({
        origin: startCoords,
        destination: endCoords,
      });
      initialDirectionsRef.current = result;
      setHasRoute(true);

      // this is the start and end locations of the route generated
      const endpoints = extractLegEndpoints(result);
      if (endpoints) {
        setRouteStart(endpoints.start);
        setRouteEnd(endpoints.end);
      } else {
        alert("Could not extract route endpoints.");
      }
    } catch (e) {
      alert("Could not generate route.");
    }
  }, [startCoords, endCoords, isLoaded]);

  // Save route to DB
  const saveRoute = async () => {
    // Get the latest directions from DirectionsRenderer (handles both initial and dragged routes)
    // Once DirectionsRenderer loads, it always has the current directions
    const currentDirections = directionsRendererRef.current?.getDirections();

    if (!currentDirections || !routeStart || !routeEnd) {
      alert("Please generate a route first.");
      return;
    }

    // We save the selected starting and ending locations
    // we do not save the starting and ending locations returned from the api
    const routeData = {
      start_lat: startCoords.lat,
      start_lng: startCoords.lng,
      end_lat: endCoords.lat,
      end_lng: endCoords.lng,
      start_address: validator.isLatLong(startAddress || "")
        ? null
        : startAddress,
      end_address: validator.isLatLong(endAddress || "") ? null : endAddress,
      polyline: await addEndpoints(
        currentDirections.routes[0].overview_polyline,
        startCoords.lat,
        startCoords.lng,
        endCoords.lat,
        endCoords.lng
      ),
      distance: currentDirections.routes[0].legs[0].distance.value / 1609.344,
    };

    try {
      const result = await routeSave(routeData);
      if (result?.route_id) {
        alert(` Route saved! Route ID: ${result.route_id}`);
        if (onRouteCreated) onRouteCreated(result.route_id);
      } else {
        alert("Route saved, but no route_id returned.");
      }
    } catch (err) {
      console.error("saveRoute error:", err);
      alert(" Failed to save route.");
    }
  };

  const loadIcons = () => {
    const icons = buildIcons(window.google);
    if (icons) setCustomIcons(icons);
  };

  // Method used for selecting starting or ending location on the map
  const clickGoogleMap = async (e) => {
    if (!activePick) return;
    // grab latitude and longitude
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    //convert coordinates to address
    const address = await coordinatesToAddress(lat, lng);
    if (address) {
      const coords = { lat, lng };
      if (activePick === "start") {
        setStartCoords(coords);
        if (address.within30meters) {
          setStartAddress(address.formattedAddress);
        } else {
          setStartAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } else {
        setEndCoords(coords);
        if (address.within30meters) {
          setEndAddress(address.formattedAddress);
        } else {
          setEndAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      }
      setMapCenter(coords);
      setActivePick(null);
    }
  };

  // This is function called when user types in an address using autocomplete
  const enteredStartLocation = () => {
    const place = startAutocompleteRef.current?.getPlace?.();
    if (place?.formatted_address) {
      // Grab lat and long for coords
      const lat = place?.geometry?.location?.lat();
      const lng = place?.geometry?.location?.lng();
      setStartCoords({ lat, lng });
      setStartAddress(place.formatted_address);
      setMapCenter({ lat, lng });
    }
  };

  // Function when address is typed into end location using auto complete
  const enteredEndLocation = () => {
    const place = endAutocompleteRef.current?.getPlace?.();
    if (place?.formatted_address) {
      // Grab lat and long for coords
      const lat = place?.geometry?.location?.lat();
      const lng = place?.geometry?.location?.lng();
      setEndCoords({ lat, lng });
      setEndAddress(place.formatted_address);
    }
  };

  // Generate route between start and end coords
  useEffect(() => {
    if (!startCoords || !endCoords || !isLoaded) return;
    generateRoute();
  }, [startCoords, endCoords, isLoaded, generateRoute]);

  // Make sure google apis are loaded before attempting to use them
  if (!isLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <div
      style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px" }}
    >
      <div style={{ marginBottom: "10px" }}>
        <Autocomplete
          onLoad={(ref) => (startAutocompleteRef.current = ref)}
          onPlaceChanged={enteredStartLocation}
        >
          <input
            type="text"
            placeholder="Start location"
            value={startAddress}
            onChange={(e) => setStartAddress(e.target.value)}
            style={{ width: "45%" }}
          />
        </Autocomplete>
        <Autocomplete
          onLoad={(ref) => (endAutocompleteRef.current = ref)}
          onPlaceChanged={enteredEndLocation}
        >
          <input
            type="text"
            placeholder="End location"
            value={endAddress}
            onChange={(e) => setEndAddress(e.target.value)}
            style={{ width: "45%" }}
          />
        </Autocomplete>
        <div style={{ marginTop: "10px" }}>
          <button onClick={() => setActivePick("start")}>
            Pick Start on Map
          </button>
          <button
            onClick={() => setActivePick("end")}
            style={{ marginLeft: "10px" }}
          >
            Pick End on Map
          </button>
          <button
            onClick={saveRoute}
            style={{ marginLeft: "10px" }}
            disabled={!hasRoute || !routeStart || !routeEnd}
          >
            Save Route
          </button>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
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
        }}
        onClick={clickGoogleMap}
      >
        {startCoords && (
          <Marker position={startCoords} icon={customIcons?.startIcon} />
        )}
        {endCoords && (
          <Marker position={endCoords} icon={customIcons?.endIcon} />
        )}
        {hasRoute && initialDirectionsRef.current && (
          <DirectionsRenderer
            directions={initialDirectionsRef.current}
            options={{
              suppressMarkers: true,
              draggable: true,
              polylineOptions,
            }}
            onLoad={(directionsRenderer) => {
              directionsRendererRef.current = directionsRenderer;
            }}
          />
        )}
        {startCoords && routeStart && (
          <Polyline
            path={[startCoords, routeStart]}
            options={polylineOptions}
          />
        )}
        {endCoords && routeEnd && (
          <Polyline path={[endCoords, routeEnd]} options={polylineOptions} />
        )}
      </GoogleMap>
    </div>
  );
};

export default CreateRoute;
