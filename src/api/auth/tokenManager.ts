/**
 * Token Manager Service
 *
 * Handles JWT token storage, retrieval, and management in localStorage
 * Provides secure token operations for authentication
 */

import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://breneo.onrender.com";

// ✅ Session restoration flag to prevent token clearing during session restoration
let isSessionRestoration = false;

/**
 * Token Manager - Handles all token operations
 */
export const TokenManager = {
  /**
   * Store both access and refresh tokens
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   */
  setTokens: (accessToken: string, refreshToken: string): void => {
    const accessPreview = accessToken.length > 30 
      ? `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`
      : accessToken.substring(0, 20) + "...";
    console.log("💾 TokenManager.setTokens(): Storing tokens", {
      accessToken: {
        length: accessToken.length,
        preview: accessPreview,
        full: accessToken // Full token for debugging (remove in production if needed)
      },
      refreshToken: refreshToken ? "present" : "missing",
      refreshTokenLength: refreshToken?.length || 0
    });
    localStorage.setItem("authToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    
    // Verify storage
    const stored = localStorage.getItem("authToken");
    console.log("💾 TokenManager.setTokens(): Verification", {
      stored: stored ? "success" : "failed",
      matches: stored === accessToken
    });
  },

  /**
   * Get access token from localStorage
   * @returns Access token or null
   */
  getAccessToken: (): string | null => {
    const token = localStorage.getItem("authToken");
    if (token) {
      // Show first 20 and last 10 chars for debugging (safe preview)
      const preview = token.length > 30 
        ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}`
        : token.substring(0, 20) + "...";
      console.log(
        "🔑 TokenManager.getAccessToken(): Token found",
        { 
          length: token.length,
          preview,
          full: token // Full token for debugging (remove in production if needed)
        }
      );
    } else {
      console.log("🔑 TokenManager.getAccessToken(): No token found");
    }
    return token;
  },

  /**
   * Get refresh token from localStorage
   * @returns Refresh token or null
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem("refreshToken");
  },

  /**
   * Clear all tokens from localStorage
   * @param preserveRole - If true, don't clear userRole (useful during session restoration)
   */
  clearTokens: (preserveRole: boolean = false): void => {
    const hadToken = !!localStorage.getItem("authToken");
    const hadRefreshToken = !!localStorage.getItem("refreshToken");
    const hadRole = !!localStorage.getItem("userRole");
    
    console.log("🗑️ TokenManager.clearTokens(): Clearing tokens", {
      hadToken,
      hadRefreshToken,
      hadRole,
      preserveRole,
      willClearRole: !preserveRole
    });
    
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    if (!preserveRole) {
      localStorage.removeItem("userRole"); // Only clear stored role if not preserving
    }
    
    console.log("🗑️ TokenManager.clearTokens(): Tokens cleared", {
      authToken: localStorage.getItem("authToken") ? "still exists" : "cleared",
      refreshToken: localStorage.getItem("refreshToken") ? "still exists" : "cleared",
      userRole: localStorage.getItem("userRole") || "cleared"
    });
  },

  /**
   * Check if token is expired
   * @param token - JWT token to check
   * @returns boolean - true if expired
   */
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true; // If we can't parse, consider it expired
    }
  },

  /**
   * Refresh access token using refresh token
   * @returns New access token or null if refresh fails
   */
  refreshAccessToken: async (): Promise<string | null> => {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      console.log("⚠️ No refresh token available");
      return null;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/refresh/`, {
        refresh: refreshToken,
      });

      const newAccessToken = response.data.access;
      if (newAccessToken) {
        console.log("✅ Token refresh succeeded");
        localStorage.setItem("authToken", newAccessToken);
        return newAccessToken;
      }
      console.log("⚠️ Token refresh response missing access token");
    } catch (error: any) {
      const status = error?.response?.status;
      const isServerError = status >= 500; // 500, 502, 503, etc.
      const isAuthError = status === 401 || status === 403;
      
      console.error("Token refresh failed:", {
        status,
        isServerError,
        isAuthError,
        error: error?.message,
      });

      // ✅ CRITICAL FIX: Only clear tokens on actual authentication failures (401/403)
      // Don't clear tokens on server errors (500+) - these are temporary issues
      // Also don't clear during session restoration
      if (!isSessionRestoration && isAuthError) {
        console.log("⚠️ Token refresh returned auth error (401/403), clearing tokens");
        // Only clear tokens if it's an authentication error, not a server error
        TokenManager.clearTokens(false);
      } else if (isServerError) {
        console.log("⚠️ Token refresh failed due to server error (500+), preserving tokens");
        // Don't clear tokens on server errors - the server might be having issues
        // The original token might still be valid
      } else if (isSessionRestoration) {
        console.log(
          "⚠️ Token refresh failed during session restoration, preserving tokens and role"
        );
        // During session restoration, preserve everything
        TokenManager.clearTokens(true);
      } else {
        // Other errors - be conservative and don't clear tokens
        console.log("⚠️ Token refresh failed with unknown error, preserving tokens");
      }
    }

    return null;
  },

  /**
   * Set session restoration flag
   * Used to prevent token clearing during session restoration
   * @param value - true if in session restoration, false otherwise
   */
  setSessionRestoration: (value: boolean): void => {
    isSessionRestoration = value;
  },

  /**
   * Check if currently in session restoration phase
   * @returns boolean - true if in session restoration
   */
  isInSessionRestoration: (): boolean => {
    return isSessionRestoration;
  },
};
