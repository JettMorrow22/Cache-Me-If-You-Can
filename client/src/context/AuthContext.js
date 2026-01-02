import React, { createContext, useState, useEffect, useContext } from "react";
import { getApiUrl } from "../config/api";

//creates context Object for sharing auth data
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user info on initial render by calling /api/me
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Cookies are automatically sent with fetch when credentials: 'include' is set
        const response = await fetch(getApiUrl("/api/me"), {
          credentials: "include", // Important: Include cookies in request
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Not authenticated or token expired
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function - calls login endpoint, cookie is set automatically by server
  const login = async (email, password) => {
    try {
      const loginUrl = getApiUrl("/login");
      console.log("Login: Calling API at:", loginUrl);
      console.log(
        "Login: API_BASE_URL is:",
        process.env.REACT_APP_API_URL || "(not set, using proxy)"
      );

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      // Data
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Server sets HTTP-only cookie automatically
      // User data is in response
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // Signup function - calls signup endpoint, cookie is set automatically by server
  const signup = async (signupData) => {
    try {
      const response = await fetch(getApiUrl("/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Format error message with details if available
        let errorMessage = data.error || "Signup failed";
        if (data.details && Array.isArray(data.details)) {
          errorMessage = `${errorMessage}: ${data.details.join(". ")}`;
        }
        throw new Error(errorMessage);
      }

      // Server sets HTTP-only cookie automatically
      // User data is in response
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  // Logout function - clears cookie and user state
  const logout = async () => {
    try {
      // Call logout endpoint to clear cookie on server
      await fetch(getApiUrl("/api/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear user state regardless
      setUser(null);
    }
  };

  const updateUserDetails = (updatedUser) => {
    setUser(updatedUser);
  };

  // Helper function to make authenticated API calls
  // Cookies are automatically sent with credentials: 'include'
  const authFetch = async (url, options = {}) => {
    // Use getApiUrl to ensure proper URL construction
    const apiUrl = url.startsWith("http") ? url : getApiUrl(url);
    const response = await fetch(apiUrl, {
      ...options,
      credentials: "include", // Always include cookies
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
      },
    });

    return response;
  };

  // what is shared to all other components
  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    authFetch,
    isAuthenticated: !!user,
    isLeader: user?.is_leader || false,
    isAdmin: user?.is_admin || false,
    updateUserDetails,
  };

  // value is available to all child components
  // children is everything wrapped inside it
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}
