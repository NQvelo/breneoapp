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
  // Profile page: me profile, educations, work-experiences, skills
  ME: {
    /** Current user profile */
    ROOT: "/api/me/",
    PROFILE: "/api/me/profile/",
    SKILLS: "/api/me/skills/",
    INDUSTRY_PROFILE: "/api/me/industry-profile/",
    MATCHED_PROFESSIONS: "/api/me/profession/",
  },
  EDUCATIONS: "/api/educations/",
  WORK_EXPERIENCES: "/api/work-experiences/",
  SKILLS_SEARCH: "/api/skills/",
  COURSES: "/api/courses/",
  // Academy: profile is tied to authenticated user (User ref in backend). Use for academy home, profile, settings, etc.
  ACADEMY: {
    PROFILE: "/api/academy/profile/",
    DETAIL: "/api/academy/", // For academy detail by ID: /api/academy/<academy_id>/
    COURSES: "/api/academy/courses/",
    STUDENTS: "/api/academy/students/",
  },
  PAYMENTS: {
    BOG_AUTH: "/api/payments/bog/auth/",
    BOG_CREATE_ORDER: "/api/payments/bog/orders/",
  },
  JOBS: {
    SAVE_JOB: "/api/save-job/", // Use with job_id: /api/save-job/<job_id>/
  },
  INDUSTRIES: "/api/industries/",
  EMPLOYER: {
    REGISTER: "/api/employer/register/",
    VERIFY_EMAIL: "/api/employer/verify-email/",
    LOGIN: "/api/employer/login/",
    PROFILE: "/api/employer/profile/",
    /** List/create employer-owned jobs (trailing slash for Django) */
    JOBS: "/api/employer/jobs/",
    ACCESS_STATE: "/api/employer/access-state/",
    JOIN_REQUESTS: "/api/employer/join-requests/",
    JOIN_REQUESTS_ME: "/api/employer/join-requests/me/",
    JOIN_REQUESTS_INBOX: "/api/employer/join-requests/inbox/",
    JOIN_REQUEST_APPROVE: (id: string) =>
      `/api/employer/join-requests/${encodeURIComponent(id)}/approve/`,
  },
  /** In-app notifications (Django — not Supabase) */
  NOTIFICATIONS: {
    LIST: "/api/me/notifications/",
    CREATE: "/api/me/notifications/",
    READ_ALL: "/api/me/notifications/read-all/",
    MARK_READ: (id: string) =>
      `/api/me/notifications/${encodeURIComponent(id)}/read/`,
    JOB_IDS: "/api/me/job-notifications/",
    JOB_MARK: "/api/me/job-notifications/",
  },
} as const;
