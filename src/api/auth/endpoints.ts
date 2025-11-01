/**
 * API Endpoints Configuration
 *
 * Centralized API endpoint definitions for authentication and user management
 */

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/login/",
    ACADEMY_LOGIN: "/api/academy/login/",
    REGISTER: "/api/register/",
    PROFILE: "/api/profile/",
    VERIFY_CODE: "/api/verify-code/",
    VERIFY_ACADEMY_EMAIL: "/api/verify-academy-email/",
    PASSWORD_RESET: "/password-reset/request/",
    PASSWORD_RESET_VERIFY: "/password-reset/verify/",
    PASSWORD_RESET_CONFIRM: "/password-reset/set-new/",
    TOKEN_REFRESH: "/api/refresh/",
  },
  USER: {
    PROFILE: "/api/user/profile/",
    SKILLS: "/api/user/skills/",
    TESTS: "/api/user/tests/",
  },
  ACADEMY: {
    PROFILE: "/api/academy/profile/",
    COURSES: "/api/academy/courses/",
    STUDENTS: "/api/academy/students/",
  },
} as const;
