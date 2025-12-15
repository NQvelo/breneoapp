/**
 * API Client Configuration
 *
 * Axios instance configured with interceptors for authentication
 * Handles token injection, token refresh, and error handling
 */

import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { TokenManager } from "./tokenManager";
import { API_ENDPOINTS } from "./endpoints";

// Base API configuration
const API_BASE_URL = "https://breneo.onrender.com";

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor to add Bearer token to authorized requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = TokenManager.getAccessToken();

    // console.log("🔍 Request Interceptor Debug:", {
    //   url: config.url,
    //   hasToken: !!token,
    //   tokenPreview: token ? token.substring(0, 20) + "..." : "none",
    //   isExcludedEndpoint:
    //     config.url?.includes("/api/login/") ||
    //     config.url?.includes("/api/academy/login/") ||
    //     config.url?.includes("/api/register/") ||
    //     config.url?.includes("/api/refresh/") ||
    //     config.url?.includes("/api/verify-code/"),
    //   hasExistingAuth: !!config.headers?.Authorization,
    // });

    // Only add Bearer token if:
    // 1. Token exists
    // 2. Request is not to login/register/token refresh endpoints (to avoid circular auth)
    // 3. Authorization header is not already set
    if (
      token &&
      !config.url?.includes("/api/login/") &&
      !config.url?.includes("/api/academy/login/") &&
      !config.url?.includes("/api/register/") &&
      !config.url?.includes("/api/refresh/") &&
      !config.url?.includes("/api/verify-code/") &&
      !config.headers?.Authorization
    ) {
      // console.log("✅ Adding Bearer token to request");

      // Check if token is expired and try to refresh it
      if (TokenManager.isTokenExpired(token)) {
        // console.log("🔄 Token expired, attempting refresh...");
        const newToken = await TokenManager.refreshAccessToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          // console.log("✅ Token refreshed successfully");
        } else {
          config.headers.Authorization = `Bearer ${token}`;
          // console.log("⚠️ Token refresh failed, using old token");
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
        // console.log("✅ Using existing valid token");
      }
    } else {
      // console.log("❌ Not adding token:", {
      //   noToken: !token,
      //   excludedEndpoint:
      //     config.url?.includes("/api/login/") ||
      //     config.url?.includes("/api/academy/login/") ||
      //     config.url?.includes("/api/register/") ||
      //     config.url?.includes("/api/refresh/") ||
      //     config.url?.includes("/api/verify-code/"),
      //   hasExistingAuth: !!config.headers?.Authorization,
      // });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 Unauthorized, try to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip token refresh for login/register/token refresh endpoints
      if (
        originalRequest.url?.includes("/api/login/") ||
        originalRequest.url?.includes("/api/academy/login/") ||
        originalRequest.url?.includes("/api/register/") ||
        originalRequest.url?.includes("/api/refresh/")
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // ✅ Check if we're in session restoration - don't clear tokens during restoration
      const inSessionRestoration = TokenManager.isInSessionRestoration();

      // ✅ CRITICAL FIX: Don't logout on 401 for academy profile endpoints
      // These endpoints might return 401 for legitimate reasons (profile doesn't exist, etc.)
      // Let the component handle the error gracefully
      const isAcademyProfileEndpoint = originalRequest.url?.includes(
        "/api/academy/profile/"
      );
      const isAcademyEndpoint = originalRequest.url?.includes("/api/academy/");

      try {
        // console.log("🔄 Attempting token refresh for 401 error...");
        const newToken = await TokenManager.refreshAccessToken();

        // ✅ CRITICAL: Check if tokens still exist after refresh attempt
        // TokenManager might preserve tokens on server errors
        const tokenStillExists = TokenManager.getAccessToken();

        if (newToken) {
          // console.log("✅ Token refreshed successfully, retrying request");
          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          try {
            const retryResponse = await apiClient(originalRequest);
            // console.log("✅ Retry request succeeded");
            return retryResponse;
          } catch (retryError: any) {
            const retryStatus = retryError.response?.status;
            // console.log(`⚠️ Retry request failed with status: ${retryStatus}`);

            // If retry still fails with 401, check if it's an academy endpoint
            // For academy endpoints, don't logout - let component handle it
            if (retryStatus === 401 && isAcademyEndpoint) {
              // console.log(
              //   "⚠️ Academy endpoint returned 401 after token refresh - not logging out, letting component handle it"
              // );
              return Promise.reject(retryError);
            }
            // For other endpoints, reject and continue to logout logic below
            throw retryError;
          }
        } else if (tokenStillExists) {
          // Token refresh failed but original token still exists
          // This might be a server error (500) - preserve the token and let component handle it
          // console.log(
          //   "⚠️ Token refresh returned null but original token still exists - might be server error"
          // );

          // For academy endpoints, always let component handle it
          if (isAcademyEndpoint && !inSessionRestoration) {
            // console.log(
            //   "⚠️ Token refresh failed for academy endpoint but token preserved - not logging out, letting component handle it"
            // );
            return Promise.reject(error);
          }

          // For other endpoints, try using the original token
          // console.log("⚠️ Retrying with original token");
          originalRequest.headers.Authorization = `Bearer ${tokenStillExists}`;
          try {
            return await apiClient(originalRequest);
          } catch (retryWithOriginalError) {
            // If it still fails, reject and let logout logic handle it
            return Promise.reject(retryWithOriginalError);
          }
        } else {
          // Token refresh failed and token was cleared

          // Token refresh failed - check if this is an academy endpoint
          if (isAcademyEndpoint && !inSessionRestoration) {
            return Promise.reject(error);
          }
        }
      } catch (refreshError) {
        console.error("❌ Token refresh threw an error:", refreshError);

        // Check if token still exists after error
        const tokenStillExists = TokenManager.getAccessToken();
        if (tokenStillExists && isAcademyEndpoint) {
          return Promise.reject(error);
        }

        // If refresh throws an error and this is an academy endpoint, don't logout
        if (isAcademyEndpoint && !inSessionRestoration) {
          return Promise.reject(error);
        }
      }

      // ✅ Only clear tokens and redirect if NOT during session restoration
      // AND NOT an academy endpoint (academy endpoints might return 401 legitimately)
      // Note: We check isAcademyEndpoint (broader) to cover all academy endpoints
      if (!inSessionRestoration && !isAcademyEndpoint) {
        // Check if this is a 404/403/500 error - these shouldn't trigger logout
        // Only logout on actual authentication failures (401 after refresh fails)
        const errorStatus = error.response?.status;
        const isAuthError = errorStatus === 401;

        if (isAuthError) {
          // If refresh fails, clear tokens and redirect to login
          // Don't preserve role here - user needs to log in again
          TokenManager.clearTokens(false);
          if (!window.location.pathname.includes("/auth/")) {
            window.location.href = "/auth/login";
          }
        } else {
          // For other errors (404, 403, 500, etc.), just reject and let component handle it
          // Don't logout the user for these errors
          // console.log(`API error ${errorStatus} - not logging out user`);
        }
      } else if (isAcademyProfileEndpoint) {
        // For academy profile endpoints, just reject the error and let component handle it
        // Don't logout - the component knows how to handle 401/404 for academy profiles
        // console.log(
        //   "⚠️ Academy profile endpoint returned 401 - not logging out, letting component handle it"
        // );
        return Promise.reject(error);
      }
      // If it's session restoration, just reject the error and let AuthContext handle it
      // Don't clear tokens - let AuthContext decide what to do
    }

    return Promise.reject(error);
  }
);

/**
 * Helper function to create FormData requests (for file uploads)
 * @param data - Object to convert to FormData
 * @returns FormData instance
 */
export const createFormDataRequest = (
  data: Record<string, unknown>
): FormData => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key] as string | Blob);
    }
  });
  return formData;
};

export default apiClient;
