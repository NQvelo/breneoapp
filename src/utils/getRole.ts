/**
 * Role Detection Utility
 * 
 * Detects the logged-in user's role from localStorage/auth context
 * Returns 'user', 'academy', 'admin', or null if not authenticated
 * 
 * Backward compatible with both old (@/lib/api) and new (@/api/auth/tokenManager) structures
 */

// Import TokenManager - try new structure first, fallback to localStorage
import { TokenManager as NewTokenManager } from '@/api/auth/tokenManager';

// Use the imported TokenManager
const TokenManager = NewTokenManager;

/**
 * Get user role from JWT token payload
 * @returns User role ('user', 'academy', 'admin') or null if not authenticated
 */
export const getRoleFromToken = (): string | null => {
  try {
    const token = TokenManager.getAccessToken();
    if (!token) return null;

    // Decode JWT token to extract user role
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload.user_type || payload.role || null;
  } catch (error) {
    console.error('Error extracting role from token:', error);
    return null;
  }
};

/**
 * Get user role from localStorage (if stored separately)
 * @returns User role or null
 */
export const getRoleFromStorage = (): string | null => {
  try {
    return localStorage.getItem('userRole');
  } catch (error) {
    console.error('Error getting role from storage:', error);
    return null;
  }
};

/**
 * Main function to get user role
 * Priority: localStorage (from login response) > Token > null
 * Note: localStorage has user_type from login response, which is most reliable
 * @returns User role ('user', 'academy', 'admin') or null
 */
export const getRole = (): string | null => {
  // ✅ FIX: Check localStorage first (set during login from API response)
  // This is more reliable than JWT token which may not contain user_type
  const roleFromStorage = getRoleFromStorage();
  if (roleFromStorage) return roleFromStorage;

  // Fallback to token
  const roleFromToken = getRoleFromToken();
  if (roleFromToken) return roleFromToken;

  return null;
};

/**
 * Check if user is a specific role
 * @param role - Role to check ('user', 'academy', 'admin')
 * @returns boolean
 */
export const isRole = (role: string): boolean => {
  const userRole = getRole();
  return userRole === role;
};

/**
 * Check if user is an academy user
 * @returns boolean
 */
export const isAcademy = (): boolean => {
  return isRole('academy');
};

/**
 * Check if user is a regular user
 * @returns boolean
 */
export const isUser = (): boolean => {
  return isRole('user');
};

/**
 * Check if user is an admin
 * @returns boolean
 */
export const isAdmin = (): boolean => {
  return isRole('admin');
};

