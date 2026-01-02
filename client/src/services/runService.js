/**
 * Unified service for all run-related API calls
 */

import { getApiUrl } from "../config/api";

/**
 * Fetches public runs from the server with optional filters (for RunFinder)
 * @param {Object} filters - Filter object with paceMin, paceMax, distanceMin, distanceMax, dateFrom, dateTo, searchLeader, searchName
 * @param {Object} searchLocationCoords - Search location coordinates { lat, lng }
 * @param {Object} userLocation - User location coordinates { lat, lng }
 * @returns {Promise<Array>} Promise that resolves to an array of run objects
 */
export const fetchPublicRuns = async (
  filters,
  searchLocationCoords,
  userLocation
) => {
  const queryParams = new URLSearchParams();

  // Add pace filters (in seconds) - these override user account preferences if provided
  if (filters.paceMin) {
    queryParams.append("paceMin", filters.paceMin);
  }
  if (filters.paceMax) {
    queryParams.append("paceMax", filters.paceMax);
  }

  // Add distance filters (in miles) - these override user account preferences if provided
  if (
    filters.distanceMin !== "" &&
    filters.distanceMin !== null &&
    filters.distanceMin !== undefined
  ) {
    queryParams.append("distanceMin", filters.distanceMin);
  }
  if (
    filters.distanceMax !== "" &&
    filters.distanceMax !== null &&
    filters.distanceMax !== undefined
  ) {
    queryParams.append("distanceMax", filters.distanceMax);
  }

  // Add date filters
  if (filters.dateFrom) {
    queryParams.append("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    queryParams.append("dateTo", filters.dateTo);
  }

  // Add text search filters
  if (filters.searchLeader) {
    queryParams.append("searchLeader", filters.searchLeader);
  }
  if (filters.searchName) {
    queryParams.append("searchName", filters.searchName);
  }

  // Add location filter (prioritize search location, then user location)
  const locationForDistance = searchLocationCoords || userLocation;
  if (locationForDistance) {
    queryParams.append("lat", locationForDistance.lat.toString());
    queryParams.append("lng", locationForDistance.lng.toString());
  }

  const res = await fetch(getApiUrl(`/api/runs?${queryParams.toString()}`), {
    credentials: "include", // Include cookies to send JWT for user preferences
  });
  if (!res.ok) {
    throw new Error("Failed to fetch runs");
  }
  return res.json();
};

/**
 * Fetches user's personal runs (scheduled or past, joined or hosted)
 * @param {string} filter - Either "scheduled" or "past"
 * @param {string} type - Either "hosted" or undefined (for joined runs)
 * @returns {Promise<Array>} Promise that resolves to an array of run objects
 */
export const fetchMyRuns = async (filter, type) => {
  const params = new URLSearchParams({ filter });
  if (type) {
    params.append("type", type);
  }

  const response = await fetch(getApiUrl(`/api/my-runs?${params.toString()}`), {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch runs");
  }

  return response.json();
};

/**
 * Fetches participants for a specific run (leaders only)
 * @param {number} runId - The ID of the run
 * @returns {Promise<Array>} Promise that resolves to an array of participant objects
 */
export const fetchRunParticipants = async (runId) => {
  try {
    const response = await fetch(getApiUrl(`/api/runs/${runId}/participants`), {
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        data.error || `Failed to fetch participants (${response.status})`
      );
    }

    return response.json();
  } catch (error) {
    // If it's a network error or JSON parsing error
    if (error.message.includes("Unexpected token")) {
      throw new Error(
        "Server returned HTML instead of JSON. Check if backend server is running on port 5050."
      );
    }
    throw error;
  }
};

/**
 * Leaves a run (removes user from run participation)
 * @param {number} runId - The ID of the run to leave
 * @returns {Promise<void>}
 */
export const leaveRun = async (runId) => {
  const response = await fetch(getApiUrl(`/api/runs/${runId}/leave`), {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to leave run");
  }
};

/**
 * Deletes a run (leaders only - removes run and all participations)
 * @param {number} runId - The ID of the run to delete
 * @returns {Promise<void>}
 */
export const deleteRun = async (runId) => {
  const response = await fetch(getApiUrl(`/api/runs/${runId}`), {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to delete run");
  }
};

/**
 * Removes a participant from a run (leaders only)
 * @param {number} runId - The ID of the run
 * @param {number} participantId - The ID of the participant to remove
 * @returns {Promise<void>}
 */
export const removeParticipant = async (runId, participantId) => {
  const response = await fetch(
    `/api/runs/${runId}/participants/${participantId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to remove participant");
  }
};
