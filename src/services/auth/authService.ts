/**
 * Authentication Service
 *
 * Handles all authentication-related operations:
 * - User login/logout
 * - User registration
 * - Token management
 * - Session validation
 */

import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { TokenManager } from "@/api/auth/tokenManager";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user?: {
    id: string | number;
    email: string;
    user_type: string;
    [key: string]: unknown;
  };
}

/**
 * Authenticate user with email and password
 * @param credentials - Login credentials
 * @returns Auth response with tokens and user data
 */
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    {
      username: credentials.email,
      password: credentials.password,
    }
  );

  const { access, refresh } = response.data;

  if (!access) {
    throw new Error("Login succeeded but no access token returned");
  }

  // Store tokens
  if (refresh) {
    TokenManager.setTokens(access, refresh);
  } else {
    localStorage.setItem("authToken", access);
  }

  // Store user role if available
  if (response.data.user?.user_type) {
    localStorage.setItem("userRole", response.data.user.user_type);
  }

  return response.data;
};

/**
 * Register a new user
 * @param data - Registration data
 * @returns Auth response
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    API_ENDPOINTS.AUTH.REGISTER,
    data
  );
  return response.data;
};

/**
 * Get current user profile
 * @returns User profile data
 */
export const getProfile = async (): Promise<unknown> => {
  const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
  return response.data;
};

/**
 * Logout current user
 * Clears tokens and redirects to login
 */
export const logout = (): void => {
  TokenManager.clearTokens();
  window.location.href = "/auth/login";
};

/**
 * Verify if user is authenticated
 * @returns boolean
 */
export const isAuthenticated = (): boolean => {
  return !!TokenManager.getAccessToken();
};
