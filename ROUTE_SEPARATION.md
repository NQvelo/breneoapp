# Route Separation Guide

## ✅ Complete Separation of User and Academy Routes

All routes are now completely separated by role. Users cannot access academy routes and vice versa.

## Route Structure

### 🔓 Public Routes (No Authentication)
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/signup` - Sign up page
- `/auth/reset-password` - Password reset
- `/email-verification` - Email verification
- `/email-confirmed` - Email confirmed
- `/academy/register` - Academy registration (public)

### 👤 User-Only Routes (Require role: "user")
All routes have `requiredRole="user"` protection:

- `/dashboard` - User dashboard
- `/profile` - User profile
- `/settings` - User settings
- `/notifications` - User notifications
- `/interests` - User interests
- `/skill-test` - Skill test
- `/skill-path` - Skill path
- `/jobs` - Job listings
- `/courses` - Course listings
- `/course/:courseId` - Course details

**Access Control:**
- Academy users attempting to access these routes are **redirected to `/academy/dashboard`**
- Access is enforced by `ProtectedRoute` with `requiredRole="user"`

### 🎓 Academy-Only Routes (Require role: "academy")
All routes have `requiredRole="academy"` protection:

- `/academy/dashboard` - Academy dashboard
- `/academy/profile` - Academy profile
- `/academy/settings` - Academy settings
- `/academy/:academySlug` - Academy public page (protected but viewable by all)

**Access Control:**
- Regular users attempting to access these routes are **redirected to `/dashboard`**
- Access is enforced by `ProtectedRoute` with `requiredRole="academy"`

### 🌐 Common Routes (All Authenticated Users)
Available to both users and academies:

- `/terms-of-use` - Terms of use
- `/help` - Help center

**Access Control:**
- Protected by authentication only (no role requirement)
- Both users and academies can access

## Implementation Details

### 1. Route Protection
Routes use `ProtectedRoute` component with role requirements:

```tsx
// User-only route
<ProtectedRoute requiredRole="user">
  <UserDashboard />
</ProtectedRoute>

// Academy-only route
<ProtectedRoute requiredRole="academy">
  <AcademyDashboard />
</ProtectedRoute>
```

### 2. Automatic Redirects
When a user tries to access a route they don't have permission for:

- **Academy user accessing user route** → Redirected to `/academy/dashboard`
- **Regular user accessing academy route** → Redirected to `/dashboard`

This is handled automatically by `ProtectedRoute` component.

### 3. Dashboard Separation
- **User Dashboard** (`/dashboard`) - Only renders user-specific content
- **Academy Dashboard** (`/academy/dashboard`) - Only renders academy-specific content

No mixing of logic. Each dashboard is completely separate.

## Route File Organization

```
src/routes/
├── AppRoutes.tsx          # Main route definitions (completely separated)
└── RoleBasedRouter.tsx    # Automatic role-based redirects

src/pages/
├── Dashboard.tsx          # User-only dashboard
├── user/                  # User-only pages
│   ├── ProfilePage.tsx
│   ├── UserSettings.tsx
│   ├── JobsPage.tsx
│   ├── SkillTestPage.tsx
│   └── ...
└── academy/               # Academy-only pages
    ├── Dashboard.tsx      # Academy dashboard
    ├── ProfilePage.tsx
    ├── Settings.tsx
    └── ...
```

## Benefits

1. **Clear Separation** - No route mixing, clear boundaries
2. **Security** - Role-based access control prevents unauthorized access
3. **Maintainability** - Easy to understand which routes belong to which role
4. **Scalability** - Easy to add new routes for specific roles
5. **User Experience** - Automatic redirects guide users to correct pages

## Testing

To verify separation works:

1. **As Regular User:**
   - Try accessing `/academy/dashboard` → Should redirect to `/dashboard`
   - Try accessing `/dashboard` → Should work
   - Try accessing `/academy/settings` → Should redirect to `/dashboard`

2. **As Academy User:**
   - Try accessing `/dashboard` → Should redirect to `/academy/dashboard`
   - Try accessing `/academy/dashboard` → Should work
   - Try accessing `/jobs` → Should redirect to `/academy/dashboard`

## Notes

- All role checks are done at the route level, not within components
- Components themselves don't need to check roles (route protection handles it)
- If a new route is added, ensure it has the correct `requiredRole` prop

