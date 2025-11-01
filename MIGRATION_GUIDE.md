# Migration Guide

This guide helps you migrate from the old project structure to the new organized structure.

## Overview

The project has been reorganized with:
- Clear separation of `user` and `academy` roles
- Organized folders: `api/`, `routes/`, `layouts/`, `services/`
- Role detection utility (`getRole()`)
- Enhanced routing system

## Step-by-Step Migration

### 1. Update Imports

#### API Imports

**Old:**
```typescript
import { TokenManager, API_ENDPOINTS, apiClient } from '@/lib/api';
```

**New:**
```typescript
// Option 1: Import from centralized index
import { TokenManager, API_ENDPOINTS, apiClient } from '@/api';

// Option 2: Import from specific modules
import { TokenManager } from '@/api/auth/tokenManager';
import { API_ENDPOINTS } from '@/api/auth/endpoints';
import apiClient from '@/api/auth/apiClient';
```

#### Service Imports

**Old:**
```typescript
// Direct API calls in components
import apiClient from '@/lib/api';
```

**New:**
```typescript
// Use service layer
import { login, register, getProfile } from '@/services/auth/authService';
```

### 2. Update Page Imports

**Old:**
```typescript
import Dashboard from '@/pages/Dashboard';
import AcademyDashboard from '@/pages/AcademyDashboard';
```

**New:**
```typescript
import UserDashboard from '@/pages/user/Dashboard';
import AcademyDashboard from '@/pages/academy/Dashboard';
```

### 3. Update Route Definitions

**Old (in App.tsx):**
```typescript
<Routes>
  <Route path="/dashboard" element={<Dashboard />} />
  ...
</Routes>
```

**New:**
- Use `AppRoutes` component (already done in App.tsx)
- Routes are defined in `src/routes/AppRoutes.tsx`
- Add new routes there instead of in App.tsx

### 4. Use Role Detection Utility

**Old:**
```typescript
const userType = user?.user_type;
if (userType === 'academy') {
  // academy logic
}
```

**New:**
```typescript
import { getRole, isAcademy, isUser } from '@/utils/getRole';

const role = getRole(); // 'user', 'academy', 'admin', or null
if (isAcademy()) {
  // academy logic
}
```

### 5. Update Protected Routes

**Old:**
```typescript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

**New (with role protection):**
```typescript
<ProtectedRoute requiredRole="academy">
  <AcademyDashboard />
</ProtectedRoute>
```

### 6. File Organization

Move files to their new locations:

```bash
# Move user pages
mv src/pages/Dashboard.tsx src/pages/user/Dashboard.tsx
mv src/pages/ProfilePage.tsx src/pages/user/ProfilePage.tsx
# ... etc

# Move academy pages
mv src/pages/AcademyDashboard.tsx src/pages/academy/Dashboard.tsx
mv src/pages/AcademyProfilePage.tsx src/pages/academy/ProfilePage.tsx
# ... etc

# Move auth pages
mv src/pages/LoginPage.tsx src/pages/auth/LoginPage.tsx
mv src/pages/AuthPage.tsx src/pages/auth/SignupPage.tsx
# ... etc
```

### 7. Update Context Imports

The `AuthContext` remains in `src/contexts/AuthContext.tsx`, but it should import from the new API structure:

**Update AuthContext.tsx:**
```typescript
// Old
import apiClient, { API_ENDPOINTS, TokenManager } from '@/lib/api';

// New
import apiClient from '@/api/auth/apiClient';
import { API_ENDPOINTS } from '@/api/auth/endpoints';
import { TokenManager } from '@/api/auth/tokenManager';
```

## Backward Compatibility

The new structure maintains backward compatibility:

1. `getRole()` utility works with both old and new API structures
2. Old imports may still work temporarily (but should be updated)
3. Existing pages continue to work during migration

## Testing Checklist

After migration, test:

- [ ] User login/logout
- [ ] Academy login/logout
- [ ] Role-based route protection
- [ ] Dashboard redirects based on role
- [ ] Protected routes work correctly
- [ ] API calls function properly
- [ ] Token refresh works
- [ ] Page refreshes maintain session

## Rollback Plan

If issues occur:

1. The old structure files remain (if not deleted)
2. Revert `App.tsx` to use inline routes
3. Update imports back to `@/lib/api`
4. Remove role-based routing temporarily

## Need Help?

- Check `src/README.md` for structure documentation
- Review example files in `pages/*/Dashboard.tsx.example`
- See `utils/getRole.ts` for role detection examples

