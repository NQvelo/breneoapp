/**
 * Services Module Index
 * 
 * Centralized exports for all service modules
 * Provides clean imports for business logic services
 */

// Auth Services
export * from './auth/authService';

// User Services (to be implemented)
// export * from './user/userService';

// Job matching (Exp. Level %, Skill %, Industry % + overall)
export {
  normalizeSkillName,
  getStructuredJobFromDetail,
  matchJobToUser,
  matchJobDetailToUser,
  getDefaultUserMatchProfile,
  buildUserMatchProfileFromSkillTest,
} from './matching';

// Academy Services (to be implemented)
// export * from './academy/academyService';

