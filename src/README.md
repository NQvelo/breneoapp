# Project Structure Documentation

This document describes the organized, scalable folder structure for the Breneo React application.

## 📁 Folder Structure

```
src/
├── api/                      # API-related modules
│   ├── auth/                 # Authentication API
│   │   ├── apiClient.ts      # Axios instance with interceptors
│   │   ├── endpoints.ts      # API endpoint definitions
│   │   └── tokenManager.ts   # Token storage and management
│   ├── user/                 # User-specific API calls (to be implemented)
│   ├── academy/              # Academy-specific API calls (to be implemented)
│   └── index.ts              # Centralized API exports
│
├── components/               # React components
│   ├── auth/                 # Authentication components
│   │   ├── ProtectedRoute.tsx    # Route protection with role support
│   │   └── AuthForm.tsx          # Reusable auth form
│   ├── common/               # Shared components across roles
│   ├── user/                 # User-specific components
│   ├── academy/              # Academy-specific components
│   ├── layout/               # Layout components (sidebar, header, etc.)
│   └── ui/                   # UI component library (shadcn/ui)
│
├── contexts/                 # React Context providers
│   └── AuthContext.tsx       # Authentication context
│
├── hooks/                    # Custom React hooks
│   ├── use-mobile.tsx        # Mobile detection hook
│   └── use-toast.ts          # Toast notification hook
│
├── layouts/                  # Layout components
│   ├── user/                 # User layout wrapper
│   │   └── UserLayout.tsx
│   └── academy/              # Academy layout wrapper
│       └── AcademyLayout.tsx
│
├── pages/                    # Page components
│   ├── auth/                 # Authentication pages
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   └── EmailVerification.tsx
│   ├── user/                 # User pages
│   │   ├── Dashboard.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── Settings.tsx
│   │   ├── JobsPage.tsx
│   │   └── ...
│   ├── academy/              # Academy pages
│   │   ├── Dashboard.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   └── common/               # Shared pages (404, landing, etc.)
│       ├── LandingPage.tsx
│       ├── NotFound.tsx
│       └── ...
│
├── routes/                   # Routing configuration
│   ├── AppRoutes.tsx         # Main route definitions
│   └── RoleBasedRouter.tsx   # Role-based routing logic
│
├── services/                 # Business logic services
│   ├── auth/                 # Authentication services
│   │   └── authService.ts    # Login, register, logout logic
│   ├── user/                 # User services (to be implemented)
│   └── academy/              # Academy services (to be implemented)
│
├── styles/                   # Global styles
│   └── globals.css           # Global CSS (if using CSS)
│
├── utils/                    # Utility functions
│   ├── getRole.ts            # Role detection utility ⭐
│   ├── skillTestUtils.ts     # Skill test utilities
│   └── ...
│
├── integrations/             # Third-party integrations
│   └── supabase/             # Supabase client and types
│
├── data/                     # Static data
│   └── countries.ts          # Country list data
│
├── assets/                   # Static assets
│   ├── fonts/                # Font files
│   └── photos/               # Image files
│
├── App.tsx                   # Main app component
├── main.tsx                  # App entry point
└── index.css                 # Global styles
```

## 🔑 Key Features

### Role Detection (`utils/getRole.ts`)

The `getRole()` utility function detects the logged-in user's role from:
1. JWT token payload (primary)
2. localStorage (fallback)

**Usage:**
```typescript
import { getRole, isAcademy, isUser } from '@/utils/getRole';

const role = getRole(); // Returns 'user', 'academy', 'admin', or null
const isAcademyUser = isAcademy(); // Returns true/false
const isRegularUser = isUser(); // Returns true/false
```

### Role-Based Routing (`routes/AppRoutes.tsx`)

Routes are organized by access level:
- **Public routes**: Login, signup, landing page
- **Protected routes**: Require authentication
- **Role-specific routes**: Require specific role (`requiredRole` prop)

**Example:**
```tsx
<Route
  path="/academy/profile"
  element={
    <ProtectedRoute requiredRole="academy">
      <AcademyProfile />
    </ProtectedRoute>
  }
/>
```

### Protected Routes (`components/auth/ProtectedRoute.tsx`)

Enhanced `ProtectedRoute` component with role support:
- Checks authentication
- Validates user role (if `requiredRole` specified)
- Redirects to appropriate dashboard based on role
- Shows loading state during auth check

## 📝 Naming Conventions

### Files
- **Components**: PascalCase (e.g., `Dashboard.tsx`, `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `getRole.ts`, `skillTestUtils.ts`)
- **Services**: camelCase (e.g., `authService.ts`, `userService.ts`)
- **API**: camelCase (e.g., `apiClient.ts`, `tokenManager.ts`)

### Folders
- Use lowercase with hyphens for multi-word folders (e.g., `email-verification`)
- Use singular nouns (e.g., `page`, `component`, `service`)

### Imports
- Use path aliases (`@/`) for clean imports
- Group imports: external → internal → relative

**Example:**
```typescript
// External dependencies
import React from 'react';
import { useNavigate } from 'react-router-dom';

// Internal modules
import { useAuth } from '@/contexts/AuthContext';
import { getRole } from '@/utils/getRole';

// Relative imports
import './styles.css';
```

## 🚀 Best Practices

1. **Separation of Concerns**
   - API calls → `api/`
   - Business logic → `services/`
   - UI components → `components/`
   - Page components → `pages/`

2. **Role-Based Organization**
   - Separate user and academy code in their respective folders
   - Use role detection utility instead of hardcoding roles
   - Leverage role-based routing for access control

3. **Reusability**
   - Common components in `components/common/`
   - Shared utilities in `utils/`
   - Reusable layouts in `layouts/`

4. **Scalability**
   - Add new roles by extending `getRole()` utility
   - Add new routes in `routes/AppRoutes.tsx`
   - Add new services in `services/` with role-specific folders

## 🔄 Migration Guide

To migrate existing code to this structure:

1. **Move API files:**
   ```bash
   mv src/lib/api.ts src/api/auth/apiClient.ts
   ```

2. **Update imports:**
   ```typescript
   // Old
   import { TokenManager } from '@/lib/api';
   
   // New
   import { TokenManager } from '@/api/auth/tokenManager';
   ```

3. **Update page imports:**
   ```typescript
   // Old
   import Dashboard from '@/pages/Dashboard';
   
   // New
   import Dashboard from '@/pages/user/Dashboard';
   ```

4. **Update route definitions:**
   Use `AppRoutes.tsx` instead of inline routes in `App.tsx`

## 📚 Additional Resources

- See example files in `pages/` folders (files ending with `.example`)
- Check `utils/getRole.ts` for role detection implementation
- Review `routes/AppRoutes.tsx` for routing examples

