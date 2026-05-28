## Frontend integration — Breneo Notifications API (Django)

Use this document when wiring the React SPA to notification features.

**Storage:** All in-app notifications live in **Django (PostgreSQL)**. Do **not** use Supabase tables `notifications` or `job_notifications`.

**Employer join requests:** Supabase is removed. Join-request data and approve flows are backed by Django (either directly on Django routes or via a BFF proxy that forwards to Django). The SPA should treat join requests as **normal authenticated `/api/employer/*` routes** and should never require any Supabase env.

---

### Base URL and authentication

- **Base URL**: same host as other Breneo API calls.
- **Auth**: `Authorization: Bearer <access_token>` (same JWT as `/api/me/profile/`)
- **Content-Type**: `application/json` for POST/PATCH bodies
- **Trailing slashes**: **required** on every path below

**User id:** Django `User.id` (integer). API returns `recipient_id` as a **string** (e.g. `"42"`). Coerce in the client if needed.

---

### Notification object (response shape)

All notification endpoints return objects with these fields (**snake_case**):

- `id`: string
- `title`: string
- `message`: string
- `type`: `"info"` | `"success"` | `"warning"` | `"error"`
- `recipient_id`: string | null (null = **broadcast**)
- `is_read`: boolean
- `kind`: string (may be `""`)
- `metadata`: object
- `created_at`: ISO 8601 string
- `updated_at`: ISO 8601 string

---

### `kind` and `metadata` conventions

| `kind` | Who receives | `metadata` should include |
|--------|--------------|---------------------------|
| `employer_join_request` | Company admin | `request_id`, `company_id` |
| `employer_join_approved` | Requesting employer | `request_id`, `company_id` |
| `job_match` | Job seeker (self) | `job_id` |

On create, if `metadata.kind` is set and top-level `kind` is empty, Django copies `metadata.kind` → `kind`.

**Optional legacy message prefix** (for parsing old text only):

```text
employer_join_request:{request_uuid}|{name} wants to join {company}. Open Notifications to approve.
```

Prefer `kind` + `metadata.request_id` over parsing `message`.

---

## SPA endpoints (JWT required)

### 1. List notifications

```http
GET /api/me/notifications/
Authorization: Bearer <access_token>
```

Optional filter:

```http
GET /api/me/notifications/?kind=employer_join_request
```

Returns notifications where `recipient_id` = current user **or** `recipient_id` is `null` (broadcast). Newest first.

Frontend should always read `response.results` (not a bare array).

---

### 2. Create notification (current user only)

```http
POST /api/me/notifications/
Authorization: Bearer <access_token>
Content-Type: application/json
```

Any `recipient_id` in the body is ignored — always created for the authenticated user.

---

### 3. Mark one notification as read

```http
PATCH /api/me/notifications/{id}/read/
Authorization: Bearer <access_token>
Content-Type: application/json
```

- `403` if not owner, or **broadcast** (`recipient_id` null)
- Frontend should not offer “mark read” on broadcast items, or handle `403` gracefully.

---

### 4. Mark all personal notifications as read

```http
PATCH /api/me/notifications/read-all/
Authorization: Bearer <access_token>
Content-Type: application/json
```

Only rows with `recipient_id` = current user and `is_read` = false. **Does not** update broadcasts.

---

### 5. List job IDs already notified (dedup)

```http
GET /api/me/job-notifications/
Authorization: Bearer <access_token>
```

Returns:

```json
{ "job_ids": ["job-1", "job-2"] }
```

---

### 6. Record job as notified (dedup upsert)

```http
POST /api/me/job-notifications/
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{ "job_id": "job-123" }
```

Status:

- `201` first time
- `200` already recorded (idempotent)

---

## Internal endpoint (server only — do not call from browser)

```http
POST /api/internal/notifications/
X-Internal-Key: <NOTIFICATIONS_INTERNAL_KEY>
Content-Type: application/json
```

No JWT. Returns `401` if key is missing/wrong.

---

## Employer join requests (Django-backed)

These are **not** notification endpoints; they are the action APIs the employer admin uses after seeing an `employer_join_request` notification.

- `GET /api/employer/join-requests/inbox/`
- `POST /api/employer/join-requests/{id}/approve/`
- `GET /api/employer/join-requests/me/`
- `POST /api/employer/join-requests/`

The notification row is only an **alert**; link via `metadata.request_id`.

