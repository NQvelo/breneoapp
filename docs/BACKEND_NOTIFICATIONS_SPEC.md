# Backend spec: Notifications (Django)

Use this spec to replace Supabase `notifications` and `job_notifications` with Django models and REST APIs. The Breneo SPA and employer BFF already call these endpoints once implemented.

---

## Copy-paste prompt for backend / AI

```
Add to our Django backend:

1. Model Notification:
   - recipient: ForeignKey(User, null=True, blank=True, on_delete=CASCADE)  # null = broadcast
   - title: CharField
   - message: TextField
   - type: CharField choices info|success|warning|error
   - is_read: BooleanField default False
   - metadata: JSONField default {}  # e.g. { "kind": "employer_join_request", "request_id": "..." }
   - created_at, updated_at: DateTimeField

2. Model JobNotification (dedup for job-match alerts):
   - user: ForeignKey(User, on_delete=CASCADE)
   - job_id: CharField(max_length=128)
   - notified_at: DateTimeField auto_now_add
   - unique_together (user, job_id)

3. Authenticated user endpoints (same JWT as /api/me/profile/):
   - GET  /api/me/notifications/           → { "results": [ {...} ] } or paginated list
   - PATCH /api/me/notifications/{id}/read/ → mark one read, 200
   - PATCH /api/me/notifications/read-all/  → mark all read for user, 200
   - POST /api/me/notifications/            → create for self (job match); body: title, message, type
   - GET  /api/me/job-notifications/        → { "job_ids": ["id1", "id2"] }
   - POST /api/me/job-notifications/        → body: { "job_id": "..." } mark one job notified

4. Internal endpoint (BFF / server only, NOT browser):
   - POST /api/internal/notifications/
   - Header: X-Internal-Key: <NOTIFICATIONS_INTERNAL_KEY> (env on Django + BFF)
   - Body: { "recipient_id": "<user pk as string>", "title", "message", "type", "metadata": {} }
   - Creates notification for that user; 201 on success

5. Employer join requests (Supabase removed):
   - Model EmployerJoinRequest (company_id, company_name, requester, status, ...)
   - Expose join-request endpoints on Django **or** proxy via BFF to Django.
```

---

## 1. Notification model (Django)

| Field | Type | Notes |
|-------|------|--------|
| `recipient` | FK → User, null=True | `null` = broadcast (visible to all authenticated users on GET) |
| `title` | CharField | |
| `message` | TextField | |
| `type` | CharField | `info`, `success`, `warning`, `error` |
| `is_read` | BooleanField | default `False` |
| `metadata` | JSONField | optional; e.g. `employer_join_request` + `request_id` |
| `created_at` / `updated_at` | DateTimeField | |

---

## 2. Job notification dedup model

| Field | Type | Notes |
|-------|------|--------|
| `user` | FK → User | |
| `job_id` | CharField | external job id string |
| `notified_at` | DateTimeField | |

Unique on `(user, job_id)`.

---

## 3. User API contract

### GET `/api/me/notifications/`

Auth required. Return notifications where `recipient` is the current user **or** `recipient` is null (broadcast).

Order: `-created_at`.

Response (example):

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
      "metadata": {},
      "created_at": "2026-05-26T12:00:00Z",
      "updated_at": "2026-05-26T12:00:00Z"
    }
  ]
}
```

Frontend also accepts a bare array `[...]`.

### PATCH `/api/me/notifications/{id}/read/`

Auth required. Only the recipient may mark read. Body optional `{}`. Return 200.

### PATCH `/api/me/notifications/read-all/`

Auth required. Mark all unread for current user. Return 200.

### POST `/api/me/notifications/`

Auth required. Create notification for **current user** only (job-match flow from SPA).

```json
{
  "title": "New Job Match! 🎯",
  "message": "Role at Company matches your skills",
  "type": "info",
  "metadata": { "job_id": "abc123" }
}
```

### GET `/api/me/job-notifications/`

Auth required.

```json
{ "job_ids": ["job-1", "job-2"] }
```

### POST `/api/me/job-notifications/`

Auth required.

```json
{ "job_id": "job-1" }
```

---

## 4. Internal create (BFF)

### POST `/api/internal/notifications/`

- Header: `X-Internal-Key: <same secret as BFF NOTIFICATIONS_INTERNAL_KEY>`
- Body:

```json
{
  "recipient_id": "42",
  "title": "Company join request",
  "message": "employer_join_request:uuid|Jane wants to join Acme. Open Notifications to approve.",
  "type": "info",
  "metadata": {
    "kind": "employer_join_request",
    "request_id": "uuid"
  }
}
```

Used when:

1. Employer submits join request → notify each company admin.
2. Admin approves join request → notify requester (`type: success`).

---

## 5. Employer join request message convention

Keep message prefix for inbox parsing (optional):

`employer_join_request:{request_id}|{human readable text}`

Employer **Notifications** page may still use BFF `GET /api/employer/join-requests/inbox` until join requests move to Django (phase 2).

---

## 6. Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `NOTIFICATIONS_INTERNAL_KEY` | Django + BFF | Internal notification create |
| `MAIN_API_BASE_URL` | BFF | Django host (already used for JWT) |

---

## 7. Frontend / BFF files (this repo)

| File | Role |
|------|------|
| `src/api/notifications/notificationsApi.ts` | SPA → Django |
| `src/services/jobs/jobNotificationService.ts` | Job match → Django |
| `src/pages/NotificationsPage.tsx` | Inbox UI |
| `server/djangoNotifications.mjs` | BFF → internal create |
| `server/employerJoinRequests.mjs` | Uses `createDjangoNotification` instead of Supabase |

---

## 8. Testing

1. `POST /api/internal/notifications/` with valid key → row in DB.
2. Login as recipient → `GET /api/me/notifications/` includes row.
3. `PATCH .../read/` → `is_read` true.
4. Job match: `GET /api/me/job-notifications/` then `POST` → dedup works.
5. BFF approve join request → requester gets success notification via internal endpoint.
