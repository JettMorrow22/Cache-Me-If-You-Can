/**
 * Service for route-related API calls
 */
import { getApiUrl } from "../config/api";

/**
 * Fetches saved routes for the logged-in user
 * @returns {Promise<Array>} Promise that resolves to an array of route objects
 */
export const fetchSavedRoutes = async () => {
  try {
    const response = await fetch(getApiUrl("/api/routes"), {
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to fetch saved routes");
    }

    return response.json();
  } catch (error) {
    console.error("fetchSavedRoutes error:", error);
    throw error;
  }
};

/**
 * Deletes a saved route for the logged-in user
 * @param {number} routeId - The ID of the route to delete from saved routes
 * @returns {Promise<void>}
 */
export const deleteSavedRoute = async (routeId) => {
  try {
    const response = await fetch(getApiUrl(`/api/routes/${routeId}`), {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete saved route");
    }
  } catch (error) {
    console.error("deleteSavedRoute error:", error);
    throw error;
  }
};
