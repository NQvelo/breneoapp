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
    // 3. Check if the root object itself contains user data (for login responses with inline user data)
    // This handles cases where login returns: { access, refresh, email, name, user_type, ... }
    if (
      dataObj.email ||
      dataObj.username ||
      dataObj.id ||
      dataObj.user_type ||
      dataObj.name
    ) {
      // Create a clean user object by excluding non-user fields like tokens
      const userFields: User = {} as User;

      if (dataObj.id) {
        userFields.id =
          typeof dataObj.id === "string" || typeof dataObj.id === "number"
            ? dataObj.id
            : String(dataObj.id);
      }
      if (dataObj.email) userFields.email = dataObj.email as string;
      if (dataObj.username) userFields.username = dataObj.username as string;
      if (dataObj.first_name)
        userFields.first_name = dataObj.first_name as string;
      if (dataObj.last_name) userFields.last_name = dataObj.last_name as string;
      // Handle 'name' field - if first_name/last_name aren't present, use name for first_name
      if (dataObj.name && !dataObj.first_name) {
        userFields.first_name = dataObj.name as string;
      }
      if (dataObj.phone_number)
        userFields.phone_number = dataObj.phone_number as string;
      if (dataObj.profile_image !== undefined)
        userFields.profile_image = dataObj.profile_image as string | null;
      if (dataObj.user_type) userFields.user_type = dataObj.user_type as string;

      return userFields;
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
    const restoreSession = async () => {
      const token = TokenManager.getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      console.log("🔄 Starting session restoration with token");

      try {
        const res = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);

        console.log(
          "🔍 Profile response raw data:",
          JSON.stringify(res.data, null, 2)
        );
        let userData = extractUserFromData(res.data);
        console.log("Restored user data:", userData);

        // If extraction failed, try to create a minimal user from JWT token
        if (!userData) {
          console.warn(
            "⚠️ Could not extract user data from profile, creating from token"
          );

          // Decode JWT to get user info
          try {
            const parts = token.split(".");
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              console.log(
                "🔑 JWT Token payload:",
                JSON.stringify(payload, null, 2)
              );

              const userIdFromToken =
                payload.user_id || payload.sub || payload.id || "";

              userData = {
                id: userIdFromToken || String(payload.username) || "",
                email: payload.email || payload.username || "",
                username: payload.username || payload.email || "",
                first_name: payload.first_name || payload.name || "",
                user_type: payload.user_type || "user",
                profile_image: payload.profile_image || null,
              };
              console.log("✅ Created user from token payload:", userData);
            } else {
              throw new Error("Invalid JWT token format");
            }
          } catch (tokenError) {
            console.error("Failed to decode JWT token:", tokenError);
            TokenManager.clearTokens();
            setUser(null);
            return;
          }

          // If we still don't have user data, something is seriously wrong
          if (!userData || !userData.id) {
            console.error("❌ Cannot create user data from token");
            TokenManager.clearTokens();
            setUser(null);
            return;
          }
        } else {
          // If we successfully extracted from profile, use JWT token for ID
          const userIdFromToken = extractUserIdFromToken(token);
          if (userIdFromToken) {
            userData.id = userIdFromToken; // Use the numeric ID from JWT token
            console.log("Using user ID from JWT token:", userIdFromToken);
          } else if (!userData.id && userData.email) {
            userData.id = userData.email; // Fallback to email if JWT decoding fails
            console.log("Using email as ID fallback:", userData.email);
          }
        }

        // If user_type is not set in the restored data, try to fetch it from Supabase
        // This is important for academy users whose JWT might not include user_type
        if (!userData.user_type) {
          console.log(
            "No user_type found, attempting to fetch from Supabase..."
          );
          try {
            const { supabase } = await import("@/integrations/supabase/client");

            // Query the user_roles table to get the user's role
            const { data: rolesData, error: rolesError } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", String(userData.id))
              .single();

            if (!rolesError && rolesData) {
              userData.user_type = rolesData.role;
              console.log(
                "✅ Fetched user_type from database:",
                rolesData.role
              );
            } else {
              console.warn(
                "Could not fetch user_type from database:",
                rolesError
              );
            }
          } catch (supabaseError) {
            console.warn(
              "Failed to import Supabase client or fetch user_type:",
              supabaseError
            );
          }
        }

        setUser(userData);
        console.log(
          "✅ Session restored successfully for user:",
          userData.email,
          "type:",
          userData.user_type
        );
      } catch (error) {
        console.error("❌ Failed to restore session:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });

        // Only clear tokens and logout if it's an authentication error
        if (error.response?.status === 401) {
          console.error("Authentication failed (401), clearing tokens");
          TokenManager.clearTokens();
          setUser(null);
        } else {
          // For other errors (network, server error, etc.), try to restore from JWT token
          console.warn(
            "Non-auth error during session restore, attempting JWT fallback"
          );
          console.log(
            "🔑 Using token from catch block:",
            token ? "exists" : "missing"
          );
          console.log(
            "Token preview:",
            token ? token.substring(0, 50) + "..." : "no token"
          );
          try {
            const parts = token.split(".");
            console.log("Token split into parts:", parts.length);
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const userIdFromToken =
                payload.user_id || payload.sub || payload.id || "";

              const userData = {
                id: userIdFromToken || String(payload.username) || "",
                email: payload.email || payload.username || "",
                username: payload.username || payload.email || "",
                first_name: payload.first_name || payload.name || "",
                user_type: payload.user_type || "user",
                profile_image: payload.profile_image || null,
              };

              // Try to fetch user_type from Supabase if not in JWT
              if (!userData.user_type || userData.user_type === "user") {
                try {
                  const { supabase } = await import(
                    "@/integrations/supabase/client"
                  );
                  const { data: rolesData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", String(userData.id))
                    .single();

                  if (rolesData) {
                    userData.user_type = rolesData.role;
                    console.log(
                      "✅ Fetched user_type from database (fallback):",
                      rolesData.role
                    );
                  }
                } catch (supabaseError) {
                  console.warn(
                    "Could not fetch user_type in error fallback:",
                    supabaseError
                  );
                }
              }

              if (userData.id) {
                console.log(
                  "✅ Restored user from JWT fallback:",
                  userData.email
                );
                setUser(userData);
              } else {
                console.error("Cannot restore user from JWT token");
                setUser(null);
              }
            } else {
              console.error("Invalid JWT token format");
              setUser(null);
            }
          } catch (tokenError) {
            console.error(
              "Failed to decode JWT token in error handler:",
              tokenError
            );
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
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

      let userData: User | null = null;

      // ✅ START: FIX - Check if login response already contains user data
      // This is common for academy logins and some custom auth flows
      const loginResponseData = extractUserFromData(res.data);

      if (loginResponseData && loginResponseData.email) {
        console.log("User data found in login response:", loginResponseData);
        userData = loginResponseData;
      } else {
        // Only fetch from profile endpoint if user data is not in login response
        console.log(
          "No user data in login response, fetching from profile endpoint..."
        );
        try {
          const userRes = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
          userData = extractUserFromData(userRes.data);
          console.log("Logged in user data (from /api/profile/):", userData);
        } catch (profileError) {
          console.error("Failed to fetch profile:", profileError);
          // Don't throw yet - try to use data from login response if available
        }
      }

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

      // user_type should already be set from the profile/login response
      // If not available, default to "user"
      if (!userData.user_type) {
        userData.user_type = "user";
        console.log("user_type not found in profile, defaulting to 'user'");
      } else {
        console.log("✅ User type from profile:", userData.user_type);
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
