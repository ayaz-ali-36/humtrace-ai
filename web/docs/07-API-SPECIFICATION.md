# API Specification

## 1. Scope

Base URL for the local production server: http://localhost:3010

All endpoints are Next.js App Router route handlers. JSON is used unless multipart/form-data is specified. Authentication uses the HttpOnly humtrace_session cookie.

Phase 5 internal inference interfaces are described separately and are not implemented.

## 2. Common behavior

### Authentication

| Access | Behavior |
|---|---|
| Public | No session required |
| Reporter | Active REPORTER session required |
| Admin | Active ADMIN session required |
| Owner-only | Reporter session plus source resource ownership |

### Response conventions

- Success responses contain ok: true where appropriate.
- Errors use a JSON object with an error string.
- Validation errors generally return 400.
- Missing/invalid authentication returns 401 on reporter actions.
- Role or ownership denial returns 403.
- Missing records return 404.
- Conflicting lifecycle or prior action returns 409.
- Disabled/maintenance services return 503.
- Unexpected failures return a generic 500 response.

### Sensitive-data rules

- Never return passwordHash, tokenHash, storagePath, image bytes, or private image URLs.
- Contact data is null or omitted before an accepted contact request.
- Public report responses use explicit selected fields.

## 3. Endpoint summary

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /api/health | Public | Health and current phase |
| POST | /api/auth/register | Public | Create reporter account |
| POST | /api/auth/login | Public | Create session |
| POST | /api/auth/logout | Session optional | Clear session |
| GET | /api/auth/me | Public/session-aware | Return current safe user |
| POST | /api/reports | Public or reporter | Submit report and private image |
| PATCH | /api/reports/[publicId] | Reporter owner or admin | Reporter lifecycle/edit or admin moderation |
| GET | /api/track/[publicId] | Public | Track a public case |
| POST | /api/search/recommendations | Public | Smart Search |
| PATCH | /api/recommendations/[id] | Reporter owner | View, dismiss, or request contact |
| POST | /api/contact-requests | Reporter | Create direct public-report contact request |
| PATCH | /api/contact-requests/[id] | Request participant | Accept, decline, or cancel |
| GET | /api/admin/settings | Admin | Read settings |
| PATCH | /api/admin/settings | Admin | Update settings |
| POST | /api/admin/staff | Admin | Create admin staff |
| PATCH | /api/admin/users/[id] | Admin | Activate or deactivate user |

## 4. Health

### GET /api/health

Response 200:

~~~json
{
  "status": "ok",
  "service": "humtrace-ai-web",
  "phase": "phase-4.5-local-demo"
}
~~~

## 5. Authentication

### POST /api/auth/register

Access: Public  
Content-Type: application/json

Request:

~~~json
{
  "name": "Reporter Name",
  "email": "reporter@example.com",
  "phone": "+92...",
  "password": "minimum-eight-characters"
}
~~~

Rules:

- Name length at least 2.
- Email must contain @ after normalization.
- Password length at least 8.
- Email must not already exist.
- Role is always REPORTER.
- Registration does not create a session.

Success 200:

~~~json
{
  "ok": true,
  "redirectTo": "/login",
  "message": "Account created. Please sign in with your email and password."
}
~~~

Errors: 400, 409, 500.

### POST /api/auth/login

Access: Public  
Content-Type: application/json

Request:

~~~json
{
  "email": "reporter@example.com",
  "password": "secret",
  "returnTo": "/reporter/dashboard",
  "adminOnly": false
}
~~~

Behavior:

- Validates active account and bcrypt password.
- adminOnly true requires ADMIN.
- Deletes prior sessions for the user.
- Sets humtrace_session and returns a role-appropriate redirect.

Success 200:

~~~json
{
  "ok": true,
  "redirectTo": "/reporter/dashboard"
}
~~~

Errors: 401 invalid credentials/inactive account, 403 wrong portal role, 500.

### POST /api/auth/logout

Clears the current server-side session and cookie.

Response 200:

~~~json
{
  "ok": true,
  "redirectTo": "/login"
}
~~~

### GET /api/auth/me

Response 200:

~~~json
{
  "user": {
    "id": "user-id",
    "name": "Name",
    "email": "private@example.com",
    "phone": null,
    "role": "REPORTER",
    "status": "ACTIVE",
    "region": "Punjab",
    "preferredContactMethod": "EMAIL"
  }
}
~~~

user is null when no valid session exists.

## 6. Reports

### POST /api/reports

Access: Public or active reporter  
Content-Type: multipart/form-data

Core fields:

| Field | Required | Notes |
|---|---|---|
| type | Yes | missing or unidentified |
| name | Missing type | May be blank for unidentified |
| age | Yes | Display-oriented age text |
| heightFeet | Yes | Validated and converted to heightCm |
| weightKg | Yes | Numeric range validation |
| gender | Optional | Supported enumerated values |
| region | Optional | Broad public region |
| locationDetail | Optional | Specific private/report detail |
| date | Optional | Valid past or current date |
| description | Yes | Minimum descriptive content |
| clothing | Optional | Descriptive text |
| identifyingFeatures | Optional | Descriptive text |
| medicalCondition | Optional | Sensitive report detail |
| reporterName | Yes | Reporter-facing ownership context |
| reporterEmail | Yes | Does not claim an existing account |
| reporterPhone | Optional | Private |
| relationship | Optional | Reporter relationship |
| preferredContactMethod | Yes | EMAIL or PHONE |
| publicVisible | Yes | Request for public review |
| photoConfirm | Yes | Human image attestation |
| consent | Yes | Contact/report consent |
| photo | Yes | JPG, PNG, or WEBP; max 5 MB |

Success 200:

~~~json
{
  "ok": true,
  "caseId": "MP-2026-0001",
  "status": "SUBMITTED",
  "recommendations": [],
  "recommendationNotice": "No public-safe possible recommendations are available yet.",
  "message": "Report and local photo file saved for human review."
}
~~~

Errors: 400, 503, 500.

### PATCH /api/reports/[publicId]

Access: Reporter owner or admin.

Reporter request:

~~~json
{
  "action": "edit",
  "name": "Name",
  "age": "25",
  "heightCm": 170,
  "weightKg": 65,
  "gender": "Male",
  "region": "Punjab",
  "description": "Description of at least ten characters",
  "clothing": "Optional",
  "identifyingFeatures": "Optional"
}
~~~

Reporter actions:

- edit: allowed from SUBMITTED, UNDER_REVIEW, or PUBLIC; returns report to UNDER_REVIEW/LIMITED.
- close: sets CLOSED_BY_REPORTER/HIDDEN.
- reopen: sets UNDER_REVIEW/LIMITED.
- archive: sets ARCHIVED/HIDDEN.

Admin request:

~~~json
{
  "status": "PUBLIC"
}
~~~

Allowed admin statuses: UNDER_REVIEW, PUBLIC, HIDDEN, ARCHIVED.

Errors: 400, 401, 403, 404, 409, 500.

## 7. Public tracking and Smart Search

### GET /api/track/[publicId]

Access: Public.

Only publicly visible, non-hidden reports are returned. Timeline entries expose safe titles and generic summaries.

Success 200:

~~~json
{
  "report": {
    "id": "MP-2026-0001",
    "type": "Missing Person",
    "status": "Content Review Completed",
    "date": "July 2026",
    "lastUpdate": "July 2026",
    "timeline": [
      {
        "title": "Report submitted",
        "date": "July 2026",
        "summary": "Status update recorded."
      }
    ]
  }
}
~~~

Errors: 404, 503.

### POST /api/search/recommendations

Access: Public  
Content-Type: multipart/form-data

Fields: photo, age, gender, heightCm, weightKg, region, location, description, clothing, identifyingFeatures. At least one photo or descriptive field is required.

Current Phase 4.5 behavior:

- Image is validated in memory but is not analyzed or stored.
- Details are compared with public unidentified reports.
- Response contains public-safe candidate fields only.

Success 200:

~~~json
{
  "ok": true,
  "recommendations": [],
  "photoAccepted": true,
  "notice": "No detail-based possible recommendations met the current threshold."
}
~~~

Errors: 400, 503, 500.

## 8. Recommendations

### PATCH /api/recommendations/[id]

Access: Reporter who owns the source report.

Requests:

~~~json
{ "action": "view" }
~~~

~~~json
{ "action": "dismiss" }
~~~

~~~json
{
  "action": "request_contact",
  "message": "A reason containing at least ten characters."
}
~~~

The target must remain public, belong to another reporter, and have no duplicate active request. Contact is always null in this endpoint response.

Success 200:

~~~json
{
  "ok": true,
  "id": "recommendation-id",
  "status": "CONTACT_REQUESTED",
  "requestId": "request-id",
  "contact": null
}
~~~

Errors: 400, 401, 403, 404, 500.

## 9. Contact requests

### POST /api/contact-requests

Access: Reporter.

Request:

~~~json
{
  "reportId": "UI-2026-0001",
  "message": "A reason containing at least ten characters."
}
~~~

The target report must be public and owned by another reporter.

Success 200:

~~~json
{
  "ok": true,
  "requestId": "request-id",
  "message": "Contact request saved for reporter review."
}
~~~

### PATCH /api/contact-requests/[id]

Access: Contact-request participant.

Requests:

~~~json
{ "action": "accept" }
~~~

~~~json
{ "action": "decline" }
~~~

~~~json
{ "action": "cancel" }
~~~

Only the recipient can accept/decline. Only the requester can cancel. The request must be pending unless the repeated action is idempotent.

Accepted response:

~~~json
{
  "ok": true,
  "id": "request-id",
  "status": "ACCEPTED",
  "contact": {
    "method": "EMAIL",
    "value": "recipient@example.com"
  }
}
~~~

For every other status, contact is null.

Errors: 400, 401, 403, 404, 409, 500.

## 10. Administration

### GET /api/admin/settings

Access: Admin.

Returns:

~~~json
{
  "settings": {
    "publicSearchEnabled": true,
    "reportSubmissionEnabled": true,
    "recommendationDisplayThreshold": 0,
    "duplicateWarningThreshold": 85,
    "maintenanceMode": false
  }
}
~~~

### PATCH /api/admin/settings

Access: Admin.

Request:

~~~json
{
  "settings": {
    "publicSearchEnabled": true,
    "recommendationDisplayThreshold": 45
  }
}
~~~

Boolean settings accept true/false. Thresholds are integers from 0 through 100. The action is audited.

### POST /api/admin/staff

Access: Admin.

Request:

~~~json
{
  "name": "Staff Name",
  "email": "staff@example.com",
  "password": "minimum-ten-characters"
}
~~~

Success 201 returns id, name, email, and status. Errors: 400, 403, 409, 500.

### PATCH /api/admin/users/[id]

Access: Admin.

Request:

~~~json
{ "action": "activate" }
~~~

or:

~~~json
{ "action": "deactivate" }
~~~

Deactivation revokes sessions. The last active admin cannot be deactivated.

Errors: 400, 403, 404, 500.

## 11. Phase 5 internal inference contract

Status: Proposed; not a browser API.

The web application and worker should use a loopback-only service contract with:

- Internal authentication.
- Correlation ID.
- Strict request-size and timeout limits.
- Explicit model capability and version.
- Image bytes or normalized text, never arbitrary filesystem paths from callers.
- Quality metadata and vectors in the response.
- No persistence by the inference service.

Proposed operations:

| Operation | Caller | Output |
|---|---|---|
| health | Web/worker | Service readiness and loaded approved model versions |
| embed-text | Worker or Smart Search | Text vector, language metadata, warnings |
| embed-image | Worker or Smart Search | Visual vector, quality metadata, warnings |
| embed-face-region | Approved Phase 5B caller | Optional sensitive vector and quality metadata |

These operations shall not be exposed under public /api routes.

