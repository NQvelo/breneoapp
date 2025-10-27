import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

// Base API configuration
const API_BASE_URL = "https://breneo.onrender.com";

// Token management utilities
export const TokenManager = {
  // Store both access and refresh tokens
  setTokens: (accessToken: string, refreshToken: string) => {
    console.log("💾 TokenManager.setTokens(): Storing tokens");
    localStorage.setItem("authToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  },

  // Get access token
  getAccessToken: (): string | null => {
    const token = localStorage.getItem("authToken");
    console.log(
      "🔑 TokenManager.getAccessToken():",
      token ? "Token found" : "No token"
    );
    return token;
  },

  // Get refresh token
  getRefreshToken: (): string | null => {
    return localStorage.getItem("refreshToken");
  },

  // Clear all tokens
  clearTokens: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  },

  // Check if token is expired (basic JWT expiration check)
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true; // If we can't parse, consider it expired
    }
  },

  // Refresh access token using refresh token
  refreshAccessToken: async (): Promise<string | null> => {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/refresh/`, {
        refresh: refreshToken,
      });

      const newAccessToken = response.data.access;
      if (newAccessToken) {
        localStorage.setItem("authToken", newAccessToken);
        return newAccessToken;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      TokenManager.clearTokens();
    }

    return null;
  },
};

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

    console.log("🔍 Request Interceptor Debug:", {
      url: config.url,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + "..." : "none",
      isExcludedEndpoint:
        config.url?.includes("/api/login/") ||
        config.url?.includes("/api/register/") ||
        config.url?.includes("/api/refresh/") ||
        config.url?.includes("/api/verify-code/"),
      hasExistingAuth: !!config.headers?.Authorization,
    });

    // Only add Bearer token if:
    // 1. Token exists
    // 2. Request is not to login/register/token refresh endpoints (to avoid circular auth)
    // 3. Authorization header is not already set
    if (
      token &&
      !config.url?.includes("/api/login/") &&
      !config.url?.includes("/api/register/") &&
      !config.url?.includes("/api/refresh/") &&
      !config.url?.includes("/api/verify-code/") &&
      !config.headers?.Authorization
    ) {
      console.log("✅ Adding Bearer token to request");

      // Check if token is expired and try to refresh it
      if (TokenManager.isTokenExpired(token)) {
        console.log("🔄 Token expired, attempting refresh...");
        const newToken = await TokenManager.refreshAccessToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          console.log("✅ Token refreshed successfully");
        } else {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("⚠️ Token refresh failed, using old token");
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("✅ Using existing valid token");
      }
    } else {
      console.log("❌ Not adding token:", {
        noToken: !token,
        excludedEndpoint:
          config.url?.includes("/api/login/") ||
          config.url?.includes("/api/register/") ||
          config.url?.includes("/api/refresh/") ||
          config.url?.includes("/api/verify-code/"),
        hasExistingAuth: !!config.headers?.Authorization,
      });
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
        originalRequest.url?.includes("/api/register/") ||
        originalRequest.url?.includes("/api/refresh/")
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await TokenManager.refreshAccessToken();
        if (newToken) {
          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
      }

      // If refresh fails, only clear tokens and redirect if:
      // 1. User is on a protected route (not on auth pages)
      // 2. The request was an authentication check (profile endpoint)
      const isProtectedRoute = !window.location.pathname.includes("/auth/");
      const isAuthCheck = originalRequest.url?.includes("/api/profile/");

      if (isProtectedRoute && isAuthCheck) {
        // Only redirect on app mounts when checking authentication
        // Don't redirect on subsequent API calls to avoid unwanted logouts
        TokenManager.clearTokens();
        window.location.href = "/auth/login";
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to create FormData requests (for file uploads)
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

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/login/",
    REGISTER: "/api/register/",
    PROFILE: "/api/profile/",
    VERIFY_CODE: "/api/verify-code/",
    PASSWORD_RESET: "/password-reset/request/",
    PASSWORD_RESET_VERIFY: "/password-reset/verify/",
    PASSWORD_RESET_CONFIRM: "/password-reset/set-new/",
    TOKEN_REFRESH: "/api/refresh/",
  },
} as const;

export default apiClient;
