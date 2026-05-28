# Django backend prompt — Notifications API

Copy everything inside the fenced block below and paste it into your Django repo chat, ticket, or AI assistant.

---

```
You are implementing the Notifications feature for the Breneo Django REST API. The React SPA and Node employer BFF are already wired to these endpoints. Do NOT use Supabase for notifications — all notification storage must be in Django (PostgreSQL).

## Context

- Auth: same JWT Bearer token as existing endpoints (`/api/me/profile/`, `/api/work-experiences/`, `/api/employer/profile/`).
- User primary key: use Django `User.id` (integer). The frontend sends and expects `recipient_id` as a string (e.g. `"42"`).
- Trailing slashes: all URLs must end with `/` (Django convention used everywhere in this project).
- Replace legacy Supabase tables: `notifications`, `job_notifications`.

## 1. Django models

Create app `notifications` (or add to existing `users` app).

### Notification

```python
class Notification(models.Model):
    TYPE_CHOICES = [
        ("info", "Info"),
        ("success", "Success"),
        ("warning", "Warning"),
        ("error", "Error"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    # recipient=NULL → broadcast (visible to every authenticated user on GET)
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="info")
    is_read = models.BooleanField(default=False)
    # Recommended (indexed) — see section 1b. Mirror BFF metadata.kind on create.
    kind = models.CharField(max_length=64, blank=True, default="", db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "kind", "-created_at"]),
        ]
```

### JobNotification (dedup — do not notify same job twice per user)

```python
class JobNotification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_notifications",
    )
    job_id = models.CharField(max_length=128)
    notified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "job_id")]
        indexes = [models.Index(fields=["user"])]
```

Run migrations.

## 1b. Employer join request → admin notification (do we need extra fields?)

Two related datasets — do not merge into one table:

| Dataset | Role |
|---------|------|
| **EmployerJoinRequest** (Django; Supabase removed) | Source of truth: pending/approved/rejected, requester, company, **Approve** action |
| **Notification** | Alert for the bell/inbox: “someone wants to join” — points at the join request |

Flow:

1. Employer submits join request → row in **EmployerJoinRequest**.
2. BFF calls `POST /api/internal/notifications/` for each company admin.
3. Admin sees alert in notifications list; **Approve** uses join-request API (`GET /api/employer/join-requests/inbox/`, `POST .../approve/`) backed by Django.

**Minimum (v1 — no extra Notification columns beyond `metadata`):**

Store in `metadata` only:

```json
{
  "kind": "employer_join_request",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": 123
}
```

Also keep human-readable `message` with optional prefix (for legacy parsing):

`employer_join_request:{request_id}|{name} wants to join {company}. Open Notifications to approve.`

That is enough to link notification → join request. **Do not** duplicate requester email, status, or company name on `Notification` — read those from **EmployerJoinRequest** when building approve UI.

**Recommended:** add top-level `kind` CharField on `Notification` (see model above). On internal create, set `kind` from body `metadata.kind` (e.g. `employer_join_request`, `employer_join_approved`, `job_match`). Enables `GET /api/me/notifications/?kind=employer_join_request` without JSON queries.

**Known `kind` values (convention):**

| `kind` | Who receives | `metadata` should include |
|--------|----------------|---------------------------|
| `employer_join_request` | Company admins | `request_id`, `company_id` |
| `employer_join_approved` | Requesting employer | `request_id`, `company_id` |
| `job_match` | Job seeker (self) | `job_id` |

**Do not add** a separate `related_request_id` column unless you prefer it over `metadata.request_id` — one pointer is enough.

## 2. Serializers

Notification serializer fields (snake_case in JSON):

- `id` (string or int — frontend coerces to string)
- `title`, `message`, `type`
- `recipient_id` — from `recipient` FK, or `null` for broadcast
- `is_read`, `kind` (string, may be empty), `metadata`, `created_at`, `updated_at`

On internal create: if `metadata.kind` is present and `kind` field is empty, copy `metadata.kind` → `Notification.kind`.

## 3. User-facing API (JWT required)

Use the same permission class as `/api/me/profile/` (IsAuthenticated).

### GET `/api/me/notifications/`

Return notifications where:
- `recipient` = current user, OR
- `recipient` IS NULL (broadcast)

Order by `-created_at`.

Response shape (frontend accepts either):

```json
{
  "results": [
    {
      "id": "1",
      "title": "New Job Match! 🎯",
      "message": "Software Engineer at Acme matches your skills",
      "type": "info",
      "recipient_id": "42",
      "is_read": false,
      "metadata": { "kind": "job_match", "job_id": "job-123" },
      "created_at": "2026-05-26T12:00:00.000Z",
      "updated_at": "2026-05-26T12:00:00.000Z"
    }
  ]
}
```

A bare JSON array `[...]` is also OK.

### PATCH `/api/me/notifications/{id}/read/`

- Only the notification owner may mark read (`recipient` must equal current user).
- Broadcast rows (`recipient` null): either forbid mark-read or no-op with 200 — prefer 403 if not owner.
- Body: optional `{}`.
- Response: 200 with updated notification, or 404.

### PATCH `/api/me/notifications/read-all/`

Mark `is_read=True` for all notifications where `recipient=current user` and `is_read=False`.
Response: 200, e.g. `{ "updated": 5 }`.

### POST `/api/me/notifications/`

Create a notification for **the authenticated user only** (ignore any `recipient_id` in body).

Request:

```json
{
  "title": "New Job Match! 🎯",
  "message": "Role at Company matches your skills",
  "type": "info",
  "metadata": { "kind": "job_match", "job_id": "job-123" }
}
```

Response: 201 with created notification object.

Used by SPA job-match checker every ~30 minutes.

### GET `/api/me/job-notifications/`

Return job IDs already notified for current user:

```json
{ "job_ids": ["job-1", "job-2"] }
```

### POST `/api/me/job-notifications/`

Body: `{ "job_id": "job-1" }`

Upsert `JobNotification` for current user + job_id (idempotent). Response: 201 or 200.

## 4. Internal API (server / BFF only — NOT callable from browser)

### POST `/api/internal/notifications/`

Authentication: header `X-Internal-Key` must equal Django setting/env `NOTIFICATIONS_INTERNAL_KEY`. No JWT. Return 401 if missing/wrong.

Request body:

```json
{
  "recipient_id": "42",
  "title": "Company join request",
  "message": "employer_join_request:550e8400-e29b-41d4-a716-446655440000|Jane Doe wants to join Acme Corp. Open Notifications to approve.",
  "type": "info",
  "metadata": {
    "kind": "employer_join_request",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": 123
  }
}
```

- `recipient_id`: string, must match an existing User pk.
- `type`: one of info|success|warning|error.
- Create `Notification` with `recipient` set to that user, `is_read=False`.

Response: 201 with created notification.

### When the BFF calls this

1. **Employer join request created** → for each company admin `external_user_id`, notify with:
   - title: `"Company join request"`
   - message: `employer_join_request:{request_uuid}|{name} wants to join {company}. Open Notifications to approve.`
   - type: `"info"`
   - metadata: `{ "kind": "employer_join_request", "request_id": "...", "company_id": 123 }`

2. **Join request approved** → notify requester:
   - title: `"Company join approved"`
   - message: `Your request to join {company_name} was approved. You can now use the employer dashboard.`
   - type: `"success"`
   - metadata: `{ "kind": "employer_join_approved", "request_id": "...", "company_id": 123 }`

## 5. URL routing (example)

```python
# urls.py
path("api/me/notifications/", MeNotificationListCreateView.as_view()),
path("api/me/notifications/read-all/", MeNotificationReadAllView.as_view()),
path("api/me/notifications/<int:pk>/read/", MeNotificationMarkReadView.as_view()),
path("api/me/job-notifications/", MeJobNotificationView.as_view()),
path("api/internal/notifications/", InternalNotificationCreateView.as_view()),
```

Adjust pk type if you use UUID primary keys.

## 6. Settings / env

```python
NOTIFICATIONS_INTERNAL_KEY = os.environ.get("NOTIFICATIONS_INTERNAL_KEY", "")
```

Deploy the same secret on:
- Django (validates `X-Internal-Key`)
- Node employer BFF (`NOTIFICATIONS_INTERNAL_KEY` env var)

## 7. Security

- `/api/internal/notifications/` must NOT be exposed to browsers; no CORS allowance needed for SPA.
- User endpoints must not allow reading another user's notifications.
- POST `/api/me/notifications/` must always set `recipient=request.user`.

## 8. Optional phase 2 (not required for v1)

Move `employer_join_requests` from Supabase to Django. Suggested **EmployerJoinRequest** model (separate from Notification):

- `id` (UUID PK)
- `company_id` (int), `company_name` (str)
- `requester` FK(User) or `requester_user_id` (str, if you use external ids)
- `requester_email`, `requester_name`, `requester_surname`
- `status`: pending | approved | rejected
- `reviewed_by` FK(User, null=True)
- `created_at`, `updated_at`

Unique constraint: one pending request per `(company_id, requester)` (optional).

Wire BFF routes to Django instead of Supabase REST. **Notification rows stay alerts only** — still use `metadata.request_id` to link to `EmployerJoinRequest.id`.

v1: notifications on Django; join request rows can stay in Supabase until phase 2.

## 9. Acceptance tests

1. Internal POST with valid key → notification row exists for recipient.
2. User GET `/api/me/notifications/` → sees personal + broadcast rows.
3. PATCH `.../read/` → `is_read` true; second user cannot read/mark another user's row.
4. POST job-notification + GET job_ids → dedup works.
5. SPA: logged-in user opens Notifications page → list loads (no 404).
6. BFF join flow with `NOTIFICATIONS_INTERNAL_KEY` set → admins receive join request notification.

## 10. Do not

- Use Supabase for notifications or job_notifications.
- Use Firebase for in-app notification storage (push can be added later separately).
- Break existing auth on `/api/me/*` endpoints.
```

---

## Quick reference (already implemented in frontend repo)

| Client | Endpoint |
|--------|----------|
| SPA | `GET/PATCH/POST` `/api/me/notifications/`, `/api/me/job-notifications/` |
| BFF | `POST` `/api/internal/notifications/` + header `X-Internal-Key` |

See also: `docs/BACKEND_NOTIFICATIONS_SPEC.md` for field-level details.

### Employer join → admin alert (summary)

- **Extra Notification field required?** No — `metadata.request_id` + `metadata.kind` is enough for v1.
- **Recommended:** indexed `kind` CharField on `Notification`.
- **Approve action:** always from **EmployerJoinRequest**, not from the notification row.
