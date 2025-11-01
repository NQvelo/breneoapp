# CORS Error Explanation & Fix Guide

## What's Happening?

When you try to log in from `https://dashboard.breneo.app`, your browser makes a request to `https://breneo.onrender.com/api/login/`.

The browser enforces CORS (Cross-Origin Resource Sharing) policy, which means:

- **Frontend Origin**: `https://dashboard.breneo.app`
- **Backend API**: `https://breneo.onrender.com`
- **Problem**: The backend is NOT configured to accept requests from your frontend domain

## The Error Breakdown

```
Access to XMLHttpRequest at 'https://breneo.onrender.com/api/login/'
from origin 'https://dashboard.breneo.app' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Translation**: The backend server is NOT sending the required CORS headers to allow your frontend to communicate with it.

## Why This Happens

1. **Browser sends OPTIONS preflight request** → "Hey server, can I make this POST request?"
2. **Server responds without CORS headers** → Server doesn't say "yes, you're allowed"
3. **Browser blocks the request** → "No permission, request denied"

## How to Fix (Backend Configuration Required)

### If you control the backend at `https://breneo.onrender.com`:

The backend needs to return these headers for ALL OPTIONS requests and the actual API responses:

```http
Access-Control-Allow-Origin: https://dashboard.breneo.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Backend Code Examples:

#### Django/Python Backend:

```python
# Add CORS headers middleware
MIDDLEWARE = [
    # ... other middleware
    'corsheaders.middleware.CorsMiddleware',
    # ... other middleware
]

CORS_ALLOWED_ORIGINS = [
    "https://dashboard.breneo.app",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

#### Node.js/Express Backend:

```javascript
const cors = require("cors");

app.use(
  cors({
    origin: "https://dashboard.breneo.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

#### Flask/Python Backend:

```python
from flask_cors import CORS

CORS(app,
     origins=["https://dashboard.breneo.app"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
```

## Temporary Workaround (NOT RECOMMENDED for production)

If you need immediate access and can't modify the backend, you could:

1. **Run the frontend from the same origin** as the backend
2. **Use a proxy** in your Vite config (development only)
3. **Deploy frontend and backend to the same domain**

But these are **NOT PROPER SOLUTIONS** - the backend MUST be configured correctly.

## Current Frontend Code Analysis

Your frontend is correctly configured at `src/lib/api.ts`:

```typescript
const API_BASE_URL = "https://breneo.onrender.com";
```

The axios client is properly set up. The issue is **100% on the backend side**.

## Next Steps

1. **Access your Render.com dashboard**
2. **Find the backend service** at `breneo.onrender.com`
3. **Configure CORS** using one of the methods above
4. **Redeploy the backend**
5. **Test again**

## Verification

After fixing, you should see these headers in the browser's Network tab:

- `Access-Control-Allow-Origin: https://dashboard.breneo.app`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Summary

✅ **The Issue**: Backend not configured to accept requests from your frontend  
✅ **The Fix**: Configure CORS on the backend at `https://breneo.onrender.com`  
✅ **The Cause**: Cross-origin security policy (CORS) blocking the request  
❌ **NOT a frontend issue** - your frontend code is correct

---

**Created**: January 2025  
**For**: Breneo Dashboard Login Issue
