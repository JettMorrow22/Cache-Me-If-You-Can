// API configuration
// This allows the frontend to call the backend API when deployed in separate pods

// Get API base URL from environment variable or use relative path for same-pod setup
// For separate pods, you can use:
// - Internal cluster IP: http://10.43.56.115:5050 (or whatever your backend pod IP is)
// - Kubernetes Service name: http://backend-service:5050
// - Public domain: https://backend.yourdomain.com
export const API_BASE_URL = process.env.REACT_APP_API_URL || "";

// Helper function to construct full API URLs
export const getApiUrl = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (API_BASE_URL) {
    // If API_BASE_URL is set, use it (for production/deployment)
    // Ensure no double slashes
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    return `${base}${cleanPath}`;
  }

  // If no API_BASE_URL, use relative path (for development with proxy)
  // This will use the proxy defined in package.json (http://localhost:5050)
  // The proxy only works for relative URLs, not absolute URLs
  return cleanPath;
};
