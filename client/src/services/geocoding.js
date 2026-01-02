import { getDistance } from 'geolib';
import { getApiUrl } from '../config/api';

/**
 * Converts a street address to coordinates using Google Maps Geocoding API
 * @param {string} address - Street address to geocode
 * @returns {Promise<Object|null>} Object with lat and lng, or null if failed
 */
export async function addressToCoordinates(address) {
  const response = await fetch(
    getApiUrl(`/api/geocode?address=${encodeURIComponent(address)}`)
  );

  const data = await response.json();

  if (data.status === "OK" && data.results.length > 0) {
    const location = data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
    };
  } else {
    console.error("Geocoding failed:", data.status, data.error_message);
    return null;
  }
}

/**
 * Converts coordinates to a formatted address using Google Maps Reverse Geocoding API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} Object with formattedAddress, placeId, and within30meters, or null if failed
 */
export async function coordinatesToAddress(lat, lng) {
  const response = await fetch(
    getApiUrl(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`)
  );

  const data = await response.json();

  if (data.status === "OK" && data.results.length > 0) {
    const result = data.results[0];

    result.latitude = result.geometry.location.lat;
    result.longitude = result.geometry.location.lng;

    const distance = getDistance(
      { latitude: lat, longitude: lng },
      { latitude: result.latitude, longitude: result.longitude }
    );

    // Check if address starts with a plus code pattern (e.g., "77MX+RG Pearisburg, VA, USA")
    const isPlusCodeAddress = /^[A-Z0-9]{2,}\+[A-Z0-9]{2,}/i.test(result.formatted_address);
    const within30meters = !isPlusCodeAddress && distance <= 30;

    return {
      within30meters,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    };
  } else {
    console.error("Reverse geocoding failed:", data.status, data.error_message);
    return null;
  }
}

