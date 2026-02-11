# Backend spec: User Industry Profile table + API

Use this spec to add the **User Industry Profile** feature to the Django backend so it works with the existing frontend.

---

## Copy-paste prompt for backend / AI

```
Add to our Django backend:

1. New model UserIndustryProfile:
   - user: OneToOneField to User (one row per user)
   - industry_years_json: JSONField (e.g. {"fintech": 2.5, "e-commerce": 0.8}; can be {})
   - updated_at: DateTimeField (auto-set on save)

2. New endpoint PUT /api/me/industry-profile/:
   - Auth required (same as /api/work-experiences/)
   - Body: { "industry_years_json": {...}, "updated_at": "ISO8601 string" }
   - Create or update the row for the authenticated user (upsert by user)
   - Accept empty industry_years_json {} and save it
   - Return 200 on success, 401 if not authenticated, 400 for invalid body

3. Same URL GET /api/me/industry-profile/:
   - Auth required. Return the authenticated user's industry profile.
   - Response: { "industry_years_json": {...} } or { "industry_years": {...} } (frontend accepts both).
   - If no row exists, return 200 with empty object: { "industry_years_json": {} }.

Frontend calls PUT after user saves work experience. Frontend calls GET to show Industry Experience Match on job cards and job detail.
```

---

## 1. Goal

When a user adds, edits, or deletes **work experience**, the frontend recomputes their **industry years** (from a company→industry map) and sends the result to the backend. The backend must **store** this per user and **expose** it so job pages can show "Industry Experience Match %" later.

You need: **one new table (model)** and **one new API endpoint**.

---

## 2. New table (Django model)

**Model name:** `UserIndustryProfile` (or `UserIndustryProfile` in an app like `users` or `profile`).

**Fields:**

| Field | Type | Notes |
|-------|------|--------|
| `user` | OneToOneField to your `User` (or FK with unique=True) | Primary link; one row per user. |
| `industry_years_json` | JSONField | Stores `{"fintech": 2.5, "e-commerce": 0.8}`. Keys = canonical industry tags (lowercase), values = years (float). Can be empty `{}`. |
| `updated_at` | DateTimeField | When this row was last updated. Set on every save. |

**Constraints:**

- One row per user (use OneToOneField, or FK + unique on `user`).
- Allow `industry_years_json` to be `{}` (empty dict). Do not treat empty as “no data”; it means “user has no known industry experience.”

**Migrations:** Create and run migrations for the new model.

**Admin (optional):** Register the model in Django admin so you can inspect/edit rows.

---

## 3. API endpoint

**Method and URL:** `PUT /api/me/industry-profile/`

**Authentication:** Required. Use the same auth as your other “me” endpoints (e.g. `/api/me/profile/`, `/api/work-experiences/`). Identify the user from the token/session; do not take `user_id` from the request body.

**Request body (JSON):**

```json
{
  "industry_years_json": { "fintech": 2.5, "e-commerce": 0.8 },
  "updated_at": "2025-02-10T12:00:00.000Z"
}
```

- `industry_years_json`: object (dict). Keys = industry tags (strings), values = years (numbers). Can be `{}`.
- `updated_at`: string, ISO 8601 datetime. Store it in `updated_at` (you may overwrite with server time if you prefer; frontend sends it for consistency).

**Behavior:**

1. Resolve the **authenticated user** from the request.
2. **Create or update** the `UserIndustryProfile` for that user:
   - If no row exists: create one with `user=<current user>`, `industry_years_json=body["industry_years_json"]`, `updated_at=body["updated_at"]` (or now).
   - If a row exists: update `industry_years_json` and `updated_at` from the body.
3. If `industry_years_json` is missing in the body, treat it as `{}` and still save (so “no industries” is stored).

**Response:**

- **Success:** `200 OK` with a JSON body, e.g.:
  ```json
  {
    "industry_years_json": { "fintech": 2.5, "e-commerce": 0.8 },
    "updated_at": "2025-02-10T12:00:00.000Z"
  }
  ```
  Or return the full serialized model; the frontend does not depend on the response body for this call.

- **Unauthenticated:** `401 Unauthorized`.
- **Invalid body (e.g. not JSON, wrong types):** `400 Bad Request` with an error message.

**URL config:** Add the route so that `PUT /api/me/industry-profile/` hits this view (no trailing ID; the user is implied by auth). Example (Django Rest Framework style):

```text
path("api/me/industry-profile/", IndustryProfileView.as_view())
```

Use the same URL prefix as your other “me” endpoints so the full URL matches what the frontend uses (e.g. `https://your-domain.com/api/me/industry-profile/`).

---

## 4. When the frontend calls this endpoint

- After the user **saves** work experience (add / edit / delete) on the profile page, the frontend:
  1. Calls your existing work-experience APIs (create/update/delete).
  2. Fetches the new list of work experiences.
  3. Computes `industry_years_json` from that list (using a fixed company→industry map; unknown companies are omitted).
  4. Sends the result with **`PUT /api/me/industry-profile/`**.

So the backend only needs to **accept and store** the payload; it does not need to recompute industry years from work experience.

---

## 5. Checklist for “works perfectly”

- [ ] Model has `user` (one per user), `industry_years_json` (JSONField), `updated_at` (DateTimeField).
- [ ] Migrations created and applied.
- [ ] `PUT /api/me/industry-profile/` is wired and requires authentication.
- [ ] User is taken from auth only; no `user_id` in body.
- [ ] Create if no row exists; update if row exists (upsert by user).
- [ ] Empty `industry_years_json` `{}` is saved, not rejected.
- [ ] Response is 200 on success; 401 when not authenticated; 400 for bad body.
- [ ] Same base URL as rest of API (e.g. `https://web-production-80ed8.up.railway.app/api/me/industry-profile/`).

---

## 6. Optional: returning industry in job/match APIs later

When you add “Industry Experience Match %” to job detail or job list:

- Load the current user’s `UserIndustryProfile` (if any).
- Use `industry_years_json` as the user’s industry-years map.
- For each job, use the job’s industry tags (e.g. comma-separated string) and compute a match (e.g. exact/related match + years boost). The frontend already has the logic; you can reimplement the same rules in Django or expose the user’s `industry_years_json` and let the frontend compute. This spec only requires the **table and PUT endpoint** above; match computation can be a follow-up.

---

---

## 7. Troubleshooting: “Nothing is written” when user saves work experience

If the frontend runs but the `UserIndustryProfile` table stays empty:

1. **Check the browser console** (F12 → Console) after the user saves work experience. The frontend now logs:
   - `[Industry profile] refresh failed:` plus status code and error.
   - If **404**: the URL is wrong or not registered. Ensure Django has a route for `PUT /api/me/industry-profile/` (with trailing slash if your app uses it).
   - If **401**: the auth token is not sent or invalid. Ensure the same Bearer token used for `/api/work-experiences/` is sent for this endpoint (frontend uses the same `apiClient`).
   - If **500**: inspect Django logs; likely a bug in the view or model save.

2. **Confirm the endpoint in Django:**
   - URL pattern must match exactly what the frontend calls: `PUT /api/me/industry-profile/` (base URL + this path).
   - View must require authentication and use the authenticated user to create/update the row.

3. **Confirm the request body:** Frontend sends `{ "industry_years_json": {...}, "updated_at": "ISO8601" }`. The view must read these keys and save to the model (field names may be snake_case in Django).

4. **Empty `industry_years_json`:** If the user’s companies are not in the frontend’s company→industry map, the frontend still sends `{}`. The backend must **still create/update** the row with `industry_years_json = {}` so that “no industries” is stored. If the backend only creates a row when the dict is non-empty, the table will stay empty for those users.

---

**End of spec.** Implement the model and `PUT /api/me/industry-profile/` as above and the frontend will work with it.
