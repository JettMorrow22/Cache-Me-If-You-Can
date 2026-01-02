import { getApiUrl } from "../config/api";

export async function routeSave(routeData) {
  try {
    const apiUrl = getApiUrl("/api/save-route");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important: Include cookies for authentication
      body: JSON.stringify(routeData),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const text = await response.text();
        errorData = { error: text || `HTTP error! status: ${response.status}` };
      }
      console.error("routeSave error response:", errorData);
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // contains { message: "Route saved successfully" } or { route_id: ... }
  } catch (err) {
    console.error("routeSave error:", err.message);
    throw err;
  }
}
