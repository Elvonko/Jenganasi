# API Documentation

## Status

No public API is implemented yet. This document reserves conventions for the first project vertical slice. Routes must not be presented as working until implemented and tested.

## Planned conventions

- JSON REST endpoints use `/api/v1` for mobile and third-party integrations; same-origin application mutations may use typed server actions.
- Authenticated requests derive user identity and company membership from the server session. A supplied company selector must be validated against active membership.
- Responses use standard HTTP status codes. Validation errors return field-level details without leaking internal exception data; unexpected failures include a request ID.
- Mutating cookie-authenticated requests enforce same-origin/CSRF protections.
- Pagination is bounded; list/search/export endpoints apply the same authorization checks as single-record reads.
- Dates are ISO-8601. Monetary values include integer minor-unit amount and currency code. No implicit currency conversion.
- Provider callbacks are isolated by provider route, signature-verified, persisted idempotently and return a retry-safe response.
- Avoid exposing internal database IDs or fields not needed by the caller.

## First planned resources

| Resource | Operations | Authorization |
|---|---|---|
| Company | Create during onboarding; read/update own company | Owner/admin for writes; active members for allowed reads |
| Membership | List, invite, change role, revoke | Owner/admin with permission; invitee can accept only their own valid invitation |
| Project | List, create, read, update, archive | Company member plus project/role permission; external parties only through restricted published views |

## Error behavior

Expected: `400` invalid input, `401` unauthenticated, `403` not permitted, `404` unavailable/not found within authorized scope, `409` state/version conflict, `429` rate limit. Do not silently convert authorization or persistence errors into successful responses.
