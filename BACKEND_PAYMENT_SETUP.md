# Backend Payment API Setup Guide

## Overview

The frontend now calls a backend endpoint to authenticate with Bank of Georgia's payment API. This avoids CORS issues by proxying the request through your backend server.

### Quick Summary: Two Authentication Flows

1. **Your Backend → BOG API** (Outgoing)

   - Your backend authenticates with BOG to call their payment API
   - Uses: OAuth 2.0 Client Credentials (already implemented)
   - Endpoint: `POST /api/payments/bog/auth/` (your backend calls BOG)

2. **BOG → Your Backend** (Incoming Callbacks)
   - BOG authenticates with your backend when sending callbacks
   - You must implement: HTTP Basic Auth or OAuth 2.0 (see callback section)
   - Endpoint: `POST /api/payments/bog/callback/` (BOG calls your backend)

### What is Payment Gateway?

Payment Gateway is an online service that allows businesses and individuals to accept payments from customers through their websites or mobile applications. The BOG Payment Gateway enables users to interact with your service-provider via the BOG server interface.

### Protocol Description

The system works as follows:

- User issues a web request to your service-provider through the BOG server
- Your service-provider responds to BOG
- BOG processes the response and displays it to the user
- Users can execute multiple operations per payment flow

### Requirements for Service-Provider

**Web Server Requirements:**

- Must set up a web-server that is either:
  - Publicly accessible (requires HTTPS support)
  - Available only through VPN channel
- Can use any API endpoint of your choice (e.g., `http://serviceprovider:8088/api/mock`)
- Supports HTTP methods: GET, POST, PUT, PATCH, DELETE

**Security Requirements:**

- If publicly accessible, HTTPS is **mandatory**
- Must implement one of the supported authentication methods (see below)

### Authentication Methods

There are **two different authentication flows** in the BOG Payment Gateway:

#### 1. Service-Provider Authenticates with BOG (Outgoing Requests)

When your backend calls BOG's API endpoints, you need to authenticate with BOG. We currently use:

- **OAuth 2.0 - Client Credentials** ✅ (Currently implemented)
  - Your backend calls BOG's OAuth endpoint: `https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token`
  - Uses HTTP Basic Auth with `client_id:client_secret` in the Authorization header
  - Returns an `access_token` that you use for subsequent BOG API calls

#### 2. BOG Authenticates with Service-Provider (Incoming Requests)

When BOG calls your endpoints (callbacks, custom operations), BOG needs to authenticate with your service. You must implement one of these methods:

1. **HTTP Basic** - BOG sends `Authorization: Basic <base64>` header

   - Format: `Basic <base64(client_id:secret_key)>`
   - Example: `Authorization: Basic ODI4Mjo3Njk3MDY0OTlmMDcwOWUyMzQ4NDU4NjNmOThiMjMxNA==`
   - You must verify this header in your callback endpoints

2. **OAuth 2.0 - Client Credentials** - BOG calls YOUR authorization endpoint

   - You must create an authorization endpoint that BOG will call
   - BOG sends: `POST /your-auth-endpoint` with `grant_type=client_credentials`, `client_id`, `client_secret`
   - You return: `{ "access_token": "...", "created_at": timestamp, "expires_in": seconds, "token_type": "Bearer" }`
   - BOG then uses `Authorization: Bearer <token>` for subsequent calls

3. **API Key** - API key-based authentication
4. **HMAC-SHA256** - HMAC signature-based authentication

**Important:** For callbacks and custom operations, you must implement at least one authentication method so BOG can securely communicate with your endpoints.

## Required Backend Endpoint

### Endpoint: `POST /api/payments/bog/auth/`

This endpoint should:

1. Receive a POST request from the frontend
2. Make a server-to-server request to Bank of Georgia's OAuth endpoint
3. Return the access token response to the frontend

### Implementation Details

**Request:**

- Method: `POST`
- Headers: Standard (no special headers needed from frontend)
- Body: None (empty POST request)

**Backend should make this request to BOG:**

```python
# Example Python/Django implementation
import requests
import base64

def bog_auth(request):
    # Bank of Georgia credentials (store these securely in environment variables)
    CLIENT_ID = "10002864"
    CLIENT_SECRET = "vOeD8xWt16bl"

    # BOG OAuth endpoint
    BOG_TOKEN_URL = "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token"

    # Create Basic Auth header
    credentials = f"{CLIENT_ID}:{CLIENT_SECRET}"
    basic_auth = base64.b64encode(credentials.encode()).decode()

    # Make request to BOG
    response = requests.post(
        BOG_TOKEN_URL,
        headers={
            "Authorization": f"Basic {basic_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "client_credentials"},
    )

    if response.status_code == 200:
        return JsonResponse(response.json())
    else:
        return JsonResponse(
            {"error": f"BOG auth failed: {response.text}"},
            status=response.status_code
        )
```

### Example Node.js/Express Implementation

```javascript
const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/api/payments/bog/auth/", async (req, res) => {
  try {
    const CLIENT_ID = process.env.BOG_CLIENT_ID || "10002864";
    const CLIENT_SECRET = process.env.BOG_CLIENT_SECRET || "vOeD8xWt16bl";
    const BOG_TOKEN_URL =
      "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";

    // Create Basic Auth header
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      "base64"
    );

    // Make request to BOG
    const response = await axios.post(
      BOG_TOKEN_URL,
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("BOG auth error:", error);
    res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.error ||
        "Failed to authenticate with Bank of Georgia",
    });
  }
});

module.exports = router;
```

## Security Notes

1. **Store credentials securely**: Use environment variables for `CLIENT_ID` and `CLIENT_SECRET`
2. **HTTPS Required**: If your web-server is publicly accessible, HTTPS is mandatory
3. **Consider rate limiting**: Add rate limiting to prevent abuse
4. **Optional authentication**: You may want to require user authentication before allowing BOG token requests
5. **CORS**: Ensure your backend allows CORS from your frontend origin
6. **Multiple Authentication**: Consider implementing additional authentication methods (API Key, HMAC-SHA256) for enhanced security
7. **VPN Option**: For additional security, consider making your web-server available only through VPN channel

## Response Format

The endpoint should return the same response format as BOG's API:

```json
{
  "access_token": "<JWT>",
  "token_type": "Bearer",
  "expires_in": 1634719923245
}
```

## Required Backend Endpoint #2

### Endpoint: `POST /api/payments/bog/orders/`

This endpoint creates a payment order with Bank of Georgia and returns a redirect URL for the payment page.

**Request Body:**

```json
{
  "plan_name": "Pro",
  "amount": 26.99,
  "currency": "GEL",
  "external_order_id": "breneo-pro-1234567890"
}
```

**Backend should:**

1. Get an access token (reuse from auth endpoint or get a new one)
2. Create an order with BOG API using the full order request structure
3. Return the order response with redirect URL

### BOG Order Request API Details

**BOG Endpoint:** `POST https://api.bog.ge/payments/v1/ecommerce/orders`

**Required Headers:**

- `Content-Type: application/json`
- `Authorization: Bearer <jwt_token>` (token from authentication)
- `Accept-Language: ka | en` (optional, default: ka)
- `Idempotency-Key: <UUID v4>` (optional, for preventing duplicate requests)
- `Theme: light | dark` (optional, default: light)

**Required Body Parameters:**

- `callback_url` (string, required) - HTTPS web address for payment completion callbacks
- `purchase_units` (object, required) - Purchase information
  - `purchase_units.total_amount` (number, required) - Full amount to be paid
  - `purchase_units.basket` (array, required) - Array of products/services
    - `basket[].product_id` (string, required) - Product/service identifier
    - `basket[].quantity` (number, required) - Quantity (minimum: 1)
    - `basket[].unit_price` (number, required) - Unit price
    - `basket[].description` (string, optional) - Product/service name
    - `basket[].unit_discount_price` (number, optional) - Discount amount per unit
    - `basket[].vat` (number, optional) - VAT amount
    - `basket[].vat_percent` (number, optional) - VAT percentage
    - `basket[].total_price` (number, optional) - Total price for this item
    - `basket[].image` (string, optional) - Product image URL
  - `purchase_units.currency` (string, optional) - Currency: GEL (default), USD, EUR, GBP
  - `purchase_units.total_discount_amount` (number, optional) - Total discount amount
  - `purchase_units.delivery` (object, optional) - Delivery information
    - `delivery.amount` (number, optional) - Delivery fee

**Optional Body Parameters:**

- `external_order_id` (string, optional) - Your system's order identifier
- `redirect_urls` (object, optional) - Redirect URLs after payment
  - `redirect_urls.success` (string, optional) - URL for successful payment
  - `redirect_urls.fail` (string, optional) - URL for failed payment
- `application_type` (string, optional) - "web" | "mobile"
- `buyer` (object, optional) - Buyer information
  - `buyer.full_name` (string, optional)
  - `buyer.masked_email` (string, optional)
  - `buyer.masked_phone` (string, optional)
- `capture` (string, optional) - "automatic" | "manual" (default: automatic)
- `ttl` (number, optional) - Order lifespan in minutes (2-1440, default: 15)
- `payment_method` (array, optional) - Allowed payment methods: ["card", "google_pay", "apple_pay", "bog_p2p", "bog_loyalty", "bnpl", "bog_loan", "gift_card"]
- `config` (object, optional) - Payment configuration (see BOG docs for details)

**Response Format:**

```json
{
  "id": "{order_id}",
  "_links": {
    "details": {
      "href": "https://api.bog.ge/payments/v1/receipt/{order_id}"
    },
    "redirect": {
      "href": "https://payment.bog.ge/?order_id={order_id}"
    }
  }
}
```

**Important:** The redirect URL is in `_links.redirect.href`, not `redirect_url`!

### Implementation Details

**BOG Order API Endpoint:** `https://api.bog.ge/payments/v1/ecommerce/orders`

**Request to BOG:**

```python
# Example Python/Django implementation
import requests
import json

def create_bog_order(request):
    # Get access token first (reuse auth logic or call auth endpoint)
    access_token = get_bog_access_token()  # Implement this function

    # Get order data from request
    data = json.loads(request.body)
    plan_name = data.get('plan_name')
    amount = data.get('amount')
    currency = data.get('currency', 'GEL')
    external_order_id = data.get('external_order_id')

    # Base URL for callbacks (adjust to your domain)
    base_url = request.build_absolute_uri('/')

    # Create order payload according to BOG API specification
    order_payload = {
        "callback_url": f"{base_url}api/payments/bog/callback/",
        "external_order_id": external_order_id,
        "purchase_units": {
            "currency": currency,
            "total_amount": amount,
            "basket": [
                {
                    "product_id": plan_name.lower(),
                    "description": f"{plan_name} Subscription Plan",
                    "quantity": 1,
                    "unit_price": amount
                }
            ]
        },
        "redirect_urls": {
            "success": f"{base_url}settings?section=subscription&payment=success",
            "fail": f"{base_url}settings?section=subscription&payment=failed"
        },
        "application_type": "web",
        "ttl": 15  # Order valid for 15 minutes
    }

    # Make request to BOG
    response = requests.post(
        "https://api.bog.ge/payments/v1/ecommerce/orders",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept-Language": "ka",
            "Theme": "light"
        },
        json=order_payload
    )

    if response.status_code == 200:
        data = response.json()
        # Transform BOG response to match frontend expectations
        return JsonResponse({
            "order_id": data.get("id"),
            "redirect_url": data.get("_links", {}).get("redirect", {}).get("href"),
            "external_order_id": external_order_id
        })
    else:
        return JsonResponse(
            {"error": f"BOG order creation failed: {response.text}"},
            status=response.status_code
        )
```

### Example Node.js/Express Implementation

```javascript
router.post("/api/payments/bog/orders/", async (req, res) => {
  try {
    const { plan_name, amount, currency = "GEL", external_order_id } = req.body;

    // Get access token (reuse auth logic)
    const authResponse = await axios.post(
      "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.BOG_CLIENT_ID}:${process.env.BOG_CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = authResponse.data.access_token;
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Create order payload according to BOG API specification
    const orderPayload = {
      callback_url: `${baseUrl}/api/payments/bog/callback/`,
      external_order_id: external_order_id,
      purchase_units: {
        currency: currency,
        total_amount: amount,
        basket: [
          {
            product_id: plan_name.toLowerCase(),
            description: `${plan_name} Subscription Plan`,
            quantity: 1,
            unit_price: amount,
          },
        ],
      },
      redirect_urls: {
        success: `${baseUrl}/settings?section=subscription&payment=success`,
        fail: `${baseUrl}/settings?section=subscription&payment=failed`,
      },
      application_type: "web",
      ttl: 15, // Order valid for 15 minutes
    };

    // Create order with BOG
    const orderResponse = await axios.post(
      "https://api.bog.ge/payments/v1/ecommerce/orders",
      orderPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept-Language": "ka",
          Theme: "light",
        },
      }
    );

    // Transform BOG response to match frontend expectations
    const bogData = orderResponse.data;
    res.json({
      order_id: bogData.id,
      redirect_url: bogData._links?.redirect?.href,
      external_order_id: external_order_id,
    });
  } catch (error) {
    console.error("BOG order creation error:", error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || "Failed to create payment order",
    });
  }
});
```

**Response Format:**

Your backend endpoint should transform BOG's response and return:

```json
{
  "order_id": "order_123456",
  "redirect_url": "https://payment.bog.ge/?order_id=order_123456",
  "external_order_id": "breneo-pro-1234567890"
}
```

**Note:** BOG returns the redirect URL in `_links.redirect.href`, so your backend needs to extract it from the nested structure.

## Testing

### Test Authentication Endpoint

```bash
curl -X POST https://breneo.onrender.com/api/payments/bog/auth/
```

Expected response:

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Test Order Creation Endpoint

```bash
curl -X POST https://breneo.onrender.com/api/payments/bog/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "plan_name": "Pro",
    "amount": 26.99,
    "currency": "GEL",
    "external_order_id": "test-order-123"
  }'
```

Expected response:

```json
{
  "order_id": "order_123456",
  "redirect_url": "https://payments.bog.ge/checkout/order_123456",
  "external_order_id": "test-order-123"
}
```

## Payment Callback Handling

You'll also need to implement a callback endpoint to handle payment completion:

### Endpoint: `POST /api/payments/bog/callback/`

This endpoint receives payment status updates from BOG. Implement it according to BOG's callback documentation to update your database with payment status.

**Important Notes:**

- BOG will call this endpoint to notify you of payment status changes
- The endpoint must be publicly accessible (or via VPN) and support HTTPS
- You can use any HTTP method (GET, POST, PUT, PATCH, DELETE) as defined in your custom operations
- BOG will not use HTTP request body to transfer information for custom operations, regardless of HTTP method
- Implement proper authentication/verification to ensure callbacks are from BOG

**Callback Implementation Examples:**

#### Option 1: HTTP Basic Authentication (Recommended for Callbacks)

```python
# Example Python/Django callback handler with HTTP Basic Auth
import base64
from django.http import JsonResponse

def bog_callback(request):
    # Verify HTTP Basic Auth header
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')

    if not auth_header.startswith('Basic '):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    # Extract and decode credentials
    encoded_credentials = auth_header.split(' ')[1]
    try:
        decoded = base64.b64decode(encoded_credentials).decode('utf-8')
        client_id, secret_key = decoded.split(':', 1)
    except:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    # Verify credentials match your BOG credentials
    if client_id != "10002864" or secret_key != "vOeD8xWt16bl":
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    # Extract order_id and payment status
    order_id = request.GET.get('order_id')  # or from headers/query params
    status = request.GET.get('status')

    # Update payment status in database
    # ...

    return JsonResponse({"status": "received"})
```

```javascript
// Example Node.js/Express callback handler with HTTP Basic Auth
const express = require("express");
const router = express.Router();

router.post("/api/payments/bog/callback/", async (req, res) => {
  try {
    // Verify HTTP Basic Auth header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Extract and decode credentials
    const encodedCredentials = authHeader.split(" ")[1];
    const decoded = Buffer.from(encodedCredentials, "base64").toString("utf-8");
    const [clientId, secretKey] = decoded.split(":");

    // Verify credentials match your BOG credentials
    if (
      clientId !== process.env.BOG_CLIENT_ID ||
      secretKey !== process.env.BOG_CLIENT_SECRET
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Extract order_id and payment status
    const { order_id, status } = req.body; // or req.query/req.headers

    // Update payment status in database
    // ...

    res.json({ status: "received" });
  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).json({ error: "Callback processing failed" });
  }
});
```

#### Option 2: OAuth 2.0 Client Credentials (For Custom Operations)

If you choose OAuth 2.0 for callbacks, you need to create an authorization endpoint that BOG will call:

```python
# Authorization endpoint that BOG calls
def bog_authorize(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    grant_type = request.POST.get('grant_type')
    client_id = request.POST.get('client_id')
    client_secret = request.POST.get('client_secret')

    # Verify credentials
    if (grant_type != 'client_credentials' or
        client_id != "10002864" or
        client_secret != "vOeD8xWt16bl"):
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    # Generate access token (store this securely, associate with client_id)
    import time
    import secrets

    access_token = secrets.token_urlsafe(32)
    expires_in = 300  # 5 minutes
    created_at = int(time.time() * 1000)  # milliseconds since epoch

    # Store token in cache/database for verification
    # cache.set(f"bog_token_{access_token}", client_id, expires_in)

    return JsonResponse({
        "access_token": access_token,
        "created_at": created_at,
        "expires_in": expires_in,
        "token_type": "Bearer"
    })

# Callback endpoint that verifies Bearer token
def bog_callback(request):
    # Verify Bearer token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')

    if not auth_header.startswith('Bearer '):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    token = auth_header.split(' ')[1]

    # Verify token (check cache/database)
    # client_id = cache.get(f"bog_token_{token}")
    # if not client_id:
    #     return JsonResponse({"error": "Invalid token"}, status=401)

    # Extract order_id and payment status
    order_id = request.GET.get('order_id')
    status = request.GET.get('status')

    # Update payment status in database
    # ...

    return JsonResponse({"status": "received"})
```

```javascript
// Authorization endpoint that BOG calls
router.post("/api/payments/bog/authorize/", async (req, res) => {
  try {
    const { grant_type, client_id, client_secret } = req.body;

    // Verify credentials
    if (
      grant_type !== "client_credentials" ||
      client_id !== process.env.BOG_CLIENT_ID ||
      client_secret !== process.env.BOG_CLIENT_SECRET
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate access token
    const crypto = require("crypto");
    const access_token = crypto.randomBytes(32).toString("base64url");
    const expires_in = 300; // 5 minutes
    const created_at = Date.now(); // milliseconds since epoch

    // Store token in cache/database for verification
    // await cache.set(`bog_token_${access_token}`, client_id, expires_in);

    res.json({
      access_token,
      created_at,
      expires_in,
      token_type: "Bearer",
    });
  } catch (error) {
    res.status(500).json({ error: "Authorization failed" });
  }
});

// Callback endpoint that verifies Bearer token
router.post("/api/payments/bog/callback/", async (req, res) => {
  try {
    // Verify Bearer token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token (check cache/database)
    // const clientId = await cache.get(`bog_token_${token}`);
    // if (!clientId) {
    //   return res.status(401).json({ error: "Invalid token" });
    // }

    // Extract order_id and payment status
    const { order_id, status } = req.body;

    // Update payment status in database
    // ...

    res.json({ status: "received" });
  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).json({ error: "Callback processing failed" });
  }
});
```
