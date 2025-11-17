import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { TokenManager } from "@/api/auth/tokenManager";
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
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// ✅ START: FIX - Re-added helper function to find the user object
const extractUserFromData = (data: unknown): User | null => {
  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;

    // Helper to extract role/user_type from an object
    const extractRole = (obj: Record<string, unknown>): string | undefined => {
      // Check multiple possible field names for role
      if (obj.user_type) return String(obj.user_type);
      if (obj.role) return String(obj.role);
      if (obj.user_role) return String(obj.user_role);
      
      // Check if roles is an array (might be from user_roles table)
      if (Array.isArray(obj.roles) && obj.roles.length > 0) {
        // Get the first role, or find "academy" role if present
        const academyRole = obj.roles.find((r: unknown) => 
          typeof r === "string" && (r === "academy" || r.toLowerCase() === "academy")
        );
        if (academyRole) return String(academyRole);
        return String(obj.roles[0]);
      }
      
      return undefined;
    };

    // 1. Check for a 'user' key
    if (dataObj.user && typeof dataObj.user === "object") {
      const userObj = dataObj.user as Record<string, unknown>;
      const role = extractRole(userObj);
      if (role && !userObj.user_type && !userObj.role) {
        userObj.user_type = role;
      }
      return userObj as User;
    }
    // 2. Check for a 'profile' key
    if (dataObj.profile && typeof dataObj.profile === "object") {
      const profileObj = dataObj.profile as Record<string, unknown>;
      const role = extractRole(profileObj);
      if (role && !profileObj.user_type && !profileObj.role) {
        profileObj.user_type = role;
      }
      return profileObj as User;
    }
    // 3. Check if the root object itself contains user data (for login responses with inline user data)
    // This handles cases where login returns: { access, refresh, email, name, user_type, ... }
    if (
      dataObj.email ||
      dataObj.username ||
      dataObj.id ||
      dataObj.user_type ||
      dataObj.role ||
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
      
      // ✅ FIX: Extract role from multiple possible field names
      const extractedRole = extractRole(dataObj);
      if (extractedRole) {
        userFields.user_type = extractedRole;
        console.log("✅ Extracted role/user_type:", extractedRole, "from fields:", {
          user_type: dataObj.user_type,
          role: dataObj.role,
          user_role: dataObj.user_role,
          roles: dataObj.roles
        });
      }

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
      // ✅ FIX: Set session restoration flag at the START of the entire restoration process
      // This protects ALL API calls during session restoration
      TokenManager.setSessionRestoration(true);

      try {
        const token = TokenManager.getAccessToken();
        console.log("🔑 authToken from TokenManager:", token);
        console.log("🔑 authToken from localStorage:", typeof window !== "undefined" ? localStorage.getItem("authToken") : "N/A (SSR)");
        
        if (!token) {
          console.log("⚠️ No authToken found - ending session restoration");
          setLoading(false);
          TokenManager.setSessionRestoration(false);
          return;
        }

        console.log("🔄 Starting session restoration with token");

        // ✅ FIX: Check localStorage first for stored userRole (most reliable during refresh)
        // This was set during login and persists across page refreshes
        const storedRole = localStorage.getItem("userRole");
        if (storedRole) {
          console.log("✅ Found stored role in localStorage:", storedRole);
        }

        // First, decode JWT to get basic user info
        let jwtUserData: User | null = null;
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

            // ✅ FIX: Extract role from JWT token (check multiple field names)
            const jwtRole = payload.user_type || payload.role || payload.user_role;
            
            // If roles is an array, find academy role or use first
            let roleFromToken = jwtRole;
            if (!roleFromToken && Array.isArray(payload.roles)) {
              const academyRole = payload.roles.find((r: unknown) => 
                typeof r === "string" && (r === "academy" || r.toLowerCase() === "academy")
              );
              roleFromToken = academyRole || payload.roles[0];
            }

            jwtUserData = {
              id: userIdFromToken || String(payload.username) || "",
              email: payload.email || payload.username || "",
              username: payload.username || payload.email || "",
              first_name: payload.first_name || payload.name || "",
              user_type: roleFromToken || "user",
              profile_image: payload.profile_image || null,
            };
            console.log("✅ Created user from JWT token:", jwtUserData, {
              extractedRole: roleFromToken,
              payloadFields: {
                user_type: payload.user_type,
                role: payload.role,
                user_role: payload.user_role,
                roles: payload.roles
              }
            });
          }
        } catch (jwtError) {
          console.error("Failed to decode JWT token:", jwtError);
          // ✅ CRITICAL FIX: Don't clear tokens if JWT decode fails
          // The token might be valid but just not parseable, or it might be a different format
          // Only clear if we're certain it's invalid (e.g., malformed)
          // For now, preserve tokens and try to continue with API call
          console.warn("⚠️ JWT decode failed, but preserving token and attempting API call");
          // Don't clear tokens - let the API call determine if token is valid
          // If API call fails with 401, the interceptor will handle it
          // Set jwtUserData to null so we rely on API response
          jwtUserData = null;
        }

        // Try to fetch profile from API
        let userData: User | null = null;
        try {
          const res = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);

          console.log(
            "🔍 Profile response raw data:",
            JSON.stringify(res.data, null, 2)
          );
          
          // ✅ DEBUG: Check for roles in user_roles array or similar structures
          const responseData = res.data as Record<string, unknown>;
          if (responseData.user_roles && Array.isArray(responseData.user_roles)) {
            console.log("🔍 Found user_roles array in response:", responseData.user_roles);
            // Try to find academy role
            const academyRoleEntry = (responseData.user_roles as Array<Record<string, unknown>>).find(
              (roleEntry: Record<string, unknown>) => 
                roleEntry.role === "academy" || roleEntry.role === "academy"
            );
            if (academyRoleEntry) {
              console.log("✅ Found academy role in user_roles:", academyRoleEntry);
              // Add role to response data if not present
              if (!responseData.user_type && !responseData.role) {
                responseData.user_type = "academy";
                console.log("✅ Set user_type to 'academy' from user_roles");
              }
            }
          }
          
          userData = extractUserFromData(res.data);
          console.log("✅ Restored user data after extraction:", userData, {
            user_type: userData?.user_type,
            hasUserData: !!userData
          });

          if (userData) {
            // If successfully extracted from profile, use JWT token for ID
            const userIdFromToken = extractUserIdFromToken(token);
            if (userIdFromToken) {
              userData.id = userIdFromToken;
              console.log("Using user ID from JWT token:", userIdFromToken);
            } else if (!userData.id && userData.email) {
              userData.id = userData.email;
              console.log("Using email as ID fallback:", userData.email);
            }
          }
        } catch (error) {
          console.warn("⚠️ Profile API call failed, using JWT data:", error);
          // ✅ FIX: Don't fail session restoration if profile API fails
          // We can still restore using JWT data and localStorage
          userData = jwtUserData;
        }

        // If we don't have user data yet, use JWT data
        if (!userData) {
          userData = jwtUserData;
        }

        // ✅ CRITICAL: Check stored role FIRST before any other logic
        // This MUST be checked before any fallback to JWT or API data
        // The stored role is the source of truth during refresh scenarios
        const storedRoleFromLogin = localStorage.getItem("userRole");

        // ✅ FIX: Priority order for user_type (NO SUPABASE - removed):
        // 1. localStorage (stored during login - MOST RELIABLE, always check first)
        // 2. userData.user_type from API profile response (if API succeeded)
        // 3. JWT token payload user_type (if stored role not found)
        // 4. Default to "user" (only if nothing else available)

        // ✅ FALLBACK: Check if user has an academy profile (if role not found)
        // This handles cases where the role exists in the database but wasn't returned in the profile
        let hasAcademyProfile = false;
        if (!userData?.user_type && !storedRoleFromLogin) {
          try {
            const academyCheck = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);
            if (academyCheck.data && academyCheck.status !== 404) {
              hasAcademyProfile = true;
              console.log("✅ User has academy profile but no role - treating as academy user");
            }
          } catch (academyError) {
            // 404 means no academy profile, which is fine - user is not academy
            // Other errors are also fine - we'll default to "user"
            console.log("ℹ️ No academy profile found (or error checking):", (academyError as { response?: { status?: number } })?.response?.status);
          }
        }

        // ✅ CRITICAL FIX: Always prioritize stored role from localStorage
        // This ensures academy users stay as academy even when API/JWT fails
        if (storedRoleFromLogin) {
          // If we have a stored role, use it - it's the most reliable source
          // Exception: If stored role is "user" but API returned a different role, trust API
          // This handles edge case where user was upgraded to academy
          const apiRole = userData?.user_type;
          if (storedRoleFromLogin === "user" && apiRole && apiRole !== "user") {
            // Upgrade from "user" to the role from API
            userData.user_type = apiRole;
            localStorage.setItem("userRole", apiRole);
            console.log("✅ Upgrading stored 'user' role to:", apiRole);
          } else {
            // Use stored role (most reliable)
            userData.user_type = storedRoleFromLogin;
            console.log(
              "✅ Using stored role from localStorage:",
              storedRoleFromLogin
            );
          }
        } else if (userData?.user_type) {
          // No stored role, use what we got from API
          localStorage.setItem("userRole", userData.user_type);
          console.log(
            "✅ Storing user_type from API response:",
            userData.user_type
          );
        } else if (hasAcademyProfile) {
          // Fallback: User has academy profile but no role in API response
          userData.user_type = "academy";
          localStorage.setItem("userRole", "academy");
          console.log(
            "✅ User has academy profile but no role in API - setting to 'academy'"
          );
        } else if (jwtUserData?.user_type && jwtUserData.user_type !== "user") {
          // Fallback to JWT token if API didn't provide user_type and stored role missing
          userData.user_type = jwtUserData.user_type;
          localStorage.setItem("userRole", jwtUserData.user_type);
          console.log(
            "✅ Using user_type from JWT token:",
            jwtUserData.user_type
          );
        } else {
          // Last resort: default to "user" only if absolutely nothing is available
          // But DON'T overwrite if we had a stored role that was cleared by mistake
          userData.user_type = userData.user_type || "user";
          localStorage.setItem("userRole", userData.user_type);
          console.log(
            "⚠️ No user_type found, defaulting to:",
            userData.user_type
          );
        }

        // ✅ FIX: Set the user data even if some data is missing
        // We need at least email or id to restore the session
        if (userData && (userData.id || userData.email)) {
          // Ensure we have an id
          if (!userData.id && userData.email) {
            userData.id = userData.email;
          }

          // ✅ CRITICAL: Always store user_type in localStorage during restoration
          // This ensures it persists for future refreshes
          if (userData.user_type) {
            const existingRole = localStorage.getItem("userRole");
            // Only update if we got a new/updated role or if there's no existing role
            if (!existingRole || existingRole !== userData.user_type) {
              localStorage.setItem("userRole", userData.user_type);
              console.log(
                "✅ Stored/Updated user_type in localStorage during restoration:",
                userData.user_type,
                existingRole ? `(was: ${existingRole})` : "(new)"
              );
            } else {
              console.log(
                "✅ User type already correctly stored in localStorage:",
                userData.user_type
              );
            }
          }

          setUser(userData);
          console.log(
            "✅ Session restored successfully for user:",
            userData.id,
            "type:",
            userData.user_type || "unknown"
          );
        } else {
          console.error(
            "❌ Cannot restore user - missing required data (email or id)"
          );
          // ✅ FIX: Don't clear tokens if we have a valid token but just can't restore user data
          // This allows the user to still use the app, and user data might be loaded elsewhere
          // Only clear tokens if we're absolutely sure the token is invalid
          setUser(null);
        }
      } catch (error) {
        console.error("❌ Failed to restore session:", error);
        // ✅ FIX: Don't automatically clear tokens on error during session restoration
        // The token might still be valid, and clearing it would force logout
        // Only clear if we're certain the token is invalid (e.g., JWT decode failed)
        // Token clearing is now handled by the axios interceptor only for non-session-restoration requests
        setUser(null);
      } finally {
        // ✅ FIX: Always clear session restoration flag at the end of the entire process
        // This ensures the flag is cleared even if an error occurs
        TokenManager.setSessionRestoration(false);
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

  // ✅ CRITICAL FIX: Redirect users ONLY when necessary
  // Preserves current route on refresh if user is on a valid route for their role
  useEffect(() => {
    // Only redirect if:
    // 1. Not loading (session restoration complete)
    // 2. User is authenticated
    if (!loading && user) {
      const currentPath = window.location.pathname;
      // ✅ CRITICAL FIX: Check localStorage first (most reliable), then user.user_type
      // This matches the priority order in session restoration and ProtectedRoute
      const userRole =
        localStorage.getItem("userRole") || user.user_type || "user";

      // List of public routes
      const publicRoutes = [
        "/auth/login",
        "/auth/signup",
        "/auth/reset-password",
        "/email-verification",
        "/email-confirmed",
      ];
      const isPublicRoute = publicRoutes.includes(currentPath);

      // List of common routes (available to all authenticated users)
      const commonRoutes = ["/terms-of-use", "/help"];
      const isCommonRoute = commonRoutes.includes(currentPath);

      // If we're on root or a public route, redirect to appropriate dashboard
      if (currentPath === "/" || isPublicRoute) {
        if (userRole === "academy") {
          console.log("🔄 Redirecting academy user from public route to /academy/dashboard");
          navigate("/academy/dashboard", { replace: true });
        } else {
          console.log("🔄 Redirecting user from public route to /dashboard");
          navigate("/dashboard", { replace: true });
        }
        return; // Exit early after redirect
      }

      // ✅ CRITICAL: Don't redirect if user is on a common route or valid route for their role
      if (isCommonRoute) {
        // Common routes are fine for any authenticated user
        return;
      }

      // Check if user is on a valid route for their role
      const isAcademyRoute = currentPath.startsWith("/academy/");
      // Special case: /academy/:academySlug is a public academy view page, accessible to all authenticated users
      // Match pattern: /academy/{slug} but NOT /academy/dashboard, /academy/profile, etc.
      const isAcademyPublicRoute = /^\/academy\/[^/]+$/.test(currentPath) && 
                                   currentPath !== "/academy/dashboard" &&
                                   currentPath !== "/academy/profile" &&
                                   currentPath !== "/academy/settings" &&
                                   currentPath !== "/academy/register";
      
      // ✅ DEBUG: Log route detection for debugging
      console.log("🔍 Route detection:", {
        currentPath,
        userRole,
        isAcademyRoute,
        isAcademyPublicRoute,
        shouldPreserve: userRole === "academy" && isAcademyRoute && !isAcademyPublicRoute
      });
      
      const isUserRoute = 
        !isAcademyRoute && 
        !isCommonRoute && 
        (currentPath === "/dashboard" ||
         currentPath.startsWith("/profile") ||
         currentPath.startsWith("/settings") ||
         currentPath.startsWith("/notifications") ||
         currentPath.startsWith("/jobs") ||
         currentPath.startsWith("/courses") ||
         currentPath.startsWith("/skill") ||
         currentPath.startsWith("/interests"));

      // If user is on a public academy route (view page), allow them to stay
      if (isAcademyPublicRoute) {
        console.log(`✅ User is on public academy route: ${currentPath}`);
        return; // Stay on current route - this is accessible to all authenticated users
      }

      // ✅ CRITICAL FIX: Check academy routes FIRST before checking user routes
      // This prevents academy users on /academy/profile from being redirected
      if (userRole === "academy" && isAcademyRoute && !isAcademyPublicRoute) {
        // Academy user on a valid academy route - preserve it
        console.log(`✅ Academy user on valid academy route: ${currentPath}`);
        return; // Stay on current route - don't redirect
      }

      // If user is on a valid route for their role, DON'T redirect - preserve the route
      if ((userRole === "academy" && isAcademyRoute) || 
          (userRole === "user" && isUserRoute)) {
        console.log(`✅ User is on valid route for their role (${userRole}): ${currentPath}`);
        return; // Stay on current route
      }

      // Only redirect if user is on the wrong route for their role
      // Don't redirect from public academy routes (view pages)
      if (isAcademyRoute && userRole !== "academy" && !isAcademyPublicRoute) {
        console.log(
          "🔄 Non-academy user on academy-only route, redirecting to /dashboard"
        );
        navigate("/dashboard", { replace: true });
      } else if (userRole === "academy" && (currentPath === "/dashboard" || isUserRoute)) {
        console.log(
          "🔄 Academy user on user-only route, redirecting to /academy/dashboard"
        );
        navigate("/academy/dashboard", { replace: true });
      } else if (userRole === "academy" && !isAcademyRoute && !isCommonRoute) {
        // Academy user on an unknown/unmatched route - redirect to academy dashboard
        console.log(
          `🔄 Academy user on unmatched route (${currentPath}), redirecting to /academy/dashboard`
        );
        navigate("/academy/dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate]); // Re-run when user or loading state changes

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

      console.log("🔑 Login response - access token:", token);
      console.log("🔑 Login response - refresh token:", refreshToken ? "present" : "missing");
      console.log("🔑 Login response - full data keys:", Object.keys(res.data));

      if (!token) {
        throw new Error(
          "Login succeeded but did not return the required token (access or token field)."
        );
      }

      // Store both access and refresh tokens
      if (refreshToken) {
        TokenManager.setTokens(token, refreshToken);
        console.log("🔑 Stored tokens via TokenManager.setTokens");
      } else {
        // Fallback: store only access token if refresh token is not available
        localStorage.setItem("authToken", token);
        console.log("🔑 Stored authToken directly in localStorage (no refresh token)");
      }
      
      // Verify token was stored
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      console.log("🔑 Verified stored authToken:", storedToken ? "present" : "missing");

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
      // If not available, check multiple sources before defaulting to "user"
      if (!userData.user_type) {
        // ✅ FALLBACK: Check if user has an academy profile (if role not found)
        // This handles cases where the role exists in the database but wasn't returned in the profile
        let hasAcademyProfile = false;
        try {
          const academyCheck = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);
          if (academyCheck.data && academyCheck.status !== 404) {
            hasAcademyProfile = true;
            console.log("✅ User has academy profile but no role - treating as academy user");
          }
        } catch (academyError) {
          // 404 means no academy profile, which is fine - user is not academy
          // Other errors are also fine - we'll default to "user"
          console.log("ℹ️ No academy profile found (or error checking):", (academyError as { response?: { status?: number } })?.response?.status);
        }

        if (hasAcademyProfile) {
          userData.user_type = "academy";
          console.log("✅ Setting user_type to 'academy' based on academy profile check");
        } else {
          userData.user_type = "user";
          console.log("⚠️ user_type not found in profile and no academy profile - defaulting to 'user'");
        }
      } else {
        console.log("✅ User type from profile:", userData.user_type);
      }

      // ✅ FIX: Store user_type in localStorage for quick access
      if (userData.user_type) {
        localStorage.setItem("userRole", userData.user_type);
        console.log("✅ Stored user_type in localStorage:", userData.user_type);
      }

      setUser(userData);

      // Preload profile image for better performance
      if (userData?.profile_image) {
        preloadImageRef.current(userData.profile_image).catch(console.error);
      }
      // ✅ END: FIX

      // ✅ FIX: Redirect based on user type - academy users go to academy dashboard
      if (userData.user_type === "academy") {
        navigate("/academy/dashboard");
      } else {
        navigate("/dashboard");
      }
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

  // --- Update user function ---
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  // --- Refresh user function ---
  const refreshUser = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
      const userData = extractUserFromData(res.data);
      if (userData) {
        setUser(userData);
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
