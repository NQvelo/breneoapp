import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import apiClient, { API_ENDPOINTS, TokenManager } from "@/lib/api";
import { useImagePreloader } from "@/components/ui/OptimizedAvatar";

interface User {
  id: number | string; // Allow both number and string IDs
  username?: string; // Make optional since profile might not have username
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  profile_image?: string | null;
  user_type?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// ✅ START: FIX - Re-added helper function to find the user object
const extractUserFromData = (data: unknown): User | null => {
  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;
    // 1. Check for a 'user' key
    if (dataObj.user && typeof dataObj.user === "object") {
      return dataObj.user as User;
    }
    // 2. Check for a 'profile' key
    if (dataObj.profile && typeof dataObj.profile === "object") {
      return dataObj.profile as User;
    }
    // 3. Assume the whole object is the user (if it has user-like keys)
    if (dataObj.email || dataObj.username || dataObj.id) {
      return dataObj as User;
    }
  }
  return null; // Return null if no user-like data is found
};

// ✅ Helper function to extract user ID from JWT token
const extractUserIdFromToken = (token: string): string | null => {
  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));

    // Look for user_id in the payload
    return payload.user_id || payload.sub || payload.id || null;
  } catch (error) {
    console.error("Failed to decode JWT token:", error);
    return null;
  }
};
// ✅ END: FIX

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { preloadImage } = useImagePreloader();
  const preloadImageRef = useRef(preloadImage);

  // Keep ref updated with latest function
  useEffect(() => {
    preloadImageRef.current = preloadImage;
  }, [preloadImage]);

  // --- Restore user session if token exists ---
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (token) {
      apiClient
        .get(API_ENDPOINTS.AUTH.PROFILE)
        .then((res) => {
          // ✅ START: FIX - Use the helper function
          const userData = extractUserFromData(res.data);
          console.log("Restored user data:", userData);

          // Extract the proper user ID from the JWT token
          const userIdFromToken = extractUserIdFromToken(token);
          if (userIdFromToken) {
            userData.id = userIdFromToken; // Use the numeric ID from JWT token
            console.log("Using user ID from JWT token:", userIdFromToken);
          } else if (userData && !userData.id && userData.email) {
            userData.id = userData.email; // Fallback to email if JWT decoding fails
            console.log("Using email as ID fallback:", userData.email);
          }

          setUser(userData);
          // ✅ END: FIX
        })
        .catch((error) => {
          // Only clear tokens if it's actually an authentication error
          const status = error.response?.status;
          if (status === 401 || status === 403) {
            // Invalid or expired token
            console.log("Authentication error, clearing tokens");
            TokenManager.clearTokens();
            setUser(null);
          } else {
            // Network error or other non-auth error - keep user logged in
            console.log(
              "Non-auth error during profile fetch, keeping user logged in:",
              error.message
            );
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // Empty dependency array - only run once on mount

  // Preload image when user data changes
  useEffect(() => {
    if (user?.profile_image) {
      preloadImageRef.current(user.profile_image).catch(console.error);
    }
  }, [user?.profile_image]); // Only depend on the image URL

  // --- Login function ---
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        username: email,
        password,
      });

      const token = res.data.access || res.data.token; // Handle both JWT 'access' and 'token' fields
      const refreshToken = res.data.refresh; // Get refresh token

      if (!token) {
        throw new Error(
          "Login succeeded but did not return the required token (access or token field)."
        );
      }

      // Store both access and refresh tokens
      if (refreshToken) {
        TokenManager.setTokens(token, refreshToken);
      } else {
        // Fallback: store only access token if refresh token is not available
        localStorage.setItem("authToken", token);
      }

      // Wait a moment to ensure token is stored before making profile request
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Fetch user info from /api/profile/ to get the 'id'
      const userRes = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);

      // ✅ START: FIX - Use the helper function
      const userData = extractUserFromData(userRes.data);
      console.log("Logged in user data (from /api/profile/):", userData);

      if (!userData) {
        throw new Error("Failed to fetch user profile.");
      }

      // Extract the proper user ID from the JWT token
      const userIdFromToken = extractUserIdFromToken(token);
      if (userIdFromToken) {
        userData.id = userIdFromToken; // Use the numeric ID from JWT token
        console.log("Using user ID from JWT token:", userIdFromToken);
      } else if (!userData.id && userData.email) {
        userData.id = userData.email; // Fallback to email if JWT decoding fails
        console.log("Using email as ID fallback:", userData.email);
      }

      setUser(userData);

      // Preload profile image for better performance
      if (userData?.profile_image) {
        preloadImageRef.current(userData.profile_image).catch(console.error);
      }
      // ✅ END: FIX

      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Register function ---
  const register = async (email: string, password: string) => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, {
        email,
        password,
      });

      navigate("/auth/email-verification");
    } catch (err) {
      console.error("Registration failed:", err);
      throw err;
    }
  };

  // --- Logout function ---
  const logout = () => {
    TokenManager.clearTokens();
    setUser(null);
    navigate("/auth/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
