---
name: qa-server
description: >
  QA tests for the WellFit EMR API backend. Tests oRPC routers, auth endpoints,
  and clinical data APIs via curl. Covers the Hono + oRPC server running on localhost:3000.
---

# QA Server — WellFit EMR API Backend

## Testing Target

This project has **no preview deployments**. QA must test against a local dev server:

1. Ensure the server is running: `bun run dev:server` (port 3000)
2. Poll `http://localhost:3000` until it responds
3. Test health: `curl http://localhost:3000/api/health` (if health endpoint exists) or check a known endpoint
4. If the dev server cannot start, report ALL API tests as BLOCKED with the specific error

**CRITICAL:** Never fall back to a remote environment. Only localhost with the current branch's code is valid.

## Authentication in CI

The API uses Better Auth with session cookies. For API testing:

1. First authenticate via the web login flow to obtain a session cookie
2. Pass the cookie in subsequent API requests via `curl -b cookiejar.txt`
3. Alternatively, use the seed user's session if testing with seed context

The auth middleware validates sessions on protected routes. Unauthenticated requests return 401.

## App-Specific Configuration Notes

- **Framework**: Hono + oRPC (similar to tRPC but with OpenAPI support)
- **Base path**: `/api` (oRPC OpenAPI handler)
- **Chat endpoint**: `POST /api/chat` (AI SDK UI protocol)
- **Auth endpoints**: Better Auth mounts at `/api/auth/*`
- **Database**: SQLite (libsql) via Drizzle ORM
- **Test framework**: Bun test runner (`bun test` in packages/api)

## Menu of Available Test Flows

### Flow 1: Auth API
- Test `POST /api/auth/sign-in/email` with valid credentials
- Test `POST /api/auth/sign-in/email` with invalid credentials (expect error)
- Test `POST /api/auth/sign-up/email` with new account
- Test `GET /api/auth/get-session` with valid session
- Test `GET /api/auth/get-session` without session (expect 401)

### Flow 2: Patients API
- Test `patients.list` — list with pagination
- Test `patients.list` — search/filter
- Test `patients.get` — get patient by ID
- Test `patients.create` — create patient with valid data
- Test `patients.create` — validation errors with invalid data
- Test `patients.update` — update patient
- Test `patients.delete` — delete patient

### Flow 3: Encounters API
- Test `encounters.list` — list with filters
- Test `encounters.get` — get encounter by ID
- Test `encounters.create` — create encounter
- Test `encounters.close` — close an encounter
- Test `encounters.delete` — delete encounter

### Flow 4: Clinical Records API
- Test `clinicalRecords.createDiagnosis` — add diagnosis
- Test `clinicalRecords.createAllergy` — add allergy
- Test `clinicalRecords.createObservation` — add observation
- Test `clinicalRecords.createProcedure` — add procedure
- Test `clinicalRecords.listDiagnoses` — list diagnoses by encounter
- Test `clinicalRecords.deleteDiagnosis` — delete diagnosis

### Flow 5: Clinical Documents API
- Test `clinicalDocuments.create` — create document
- Test `clinicalDocuments.get` — get document by ID
- Test `clinicalDocuments.list` — list documents
- Test `clinicalDocuments.sign` — sign a document
- Test `clinicalDocuments.correct` — create correction
- Test `clinicalDocuments.delete` — delete document

### Flow 6: Medication Orders API
- Test `medicationOrders.create` — create prescription
- Test `medicationOrders.list` — list prescriptions
- Test `medicationOrders.createAdministration` — record administration
- Test `medicationOrders.listAdministrations` — list administrations
- Test `medicationOrders.delete` — delete prescription

### Flow 7: Service Requests API
- Test `serviceRequests.create` — create service request
- Test `serviceRequests.list` — list service requests
- Test `serviceRequests.createDiagnosticReport` — create report
- Test `serviceRequests.getDiagnosticReport` — get report
- Test `serviceRequests.delete` — delete service request

### Flow 8: Interconsultations API
- Test `interconsultations.create` — create interconsultation
- Test `interconsultations.list` — list interconsultations
- Test `interconsultations.respond` — respond to interconsultation
- Test `interconsultations.get` — get by ID
- Test `interconsultations.delete` — delete interconsultation

### Flow 9: Incapacity Certificates API
- Test `incapacityCertificates.create` — create certificate
- Test `incapacityCertificates.list` — list certificates
- Test `incapacityCertificates.get` — get by ID
- Test `incapacityCertificates.delete` — delete certificate

### Flow 10: Consents API
- Test `consents.createConsent` — create consent record
- Test `consents.listConsents` — list consents
- Test `consents.revokeConsent` — revoke consent
- Test `consents.createDataDisclosure` — create authorization
- Test `consents.listDataDisclosures` — list authorizations
- Test `consents.revokeDataDisclosure` — revoke authorization
- Test `consents.delete` — delete consent/authorization

### Flow 11: Attachments API
- Test `attachments.createBinary` — upload binary object
- Test `attachments.createLink` — create attachment link
- Test `attachments.list` — list attachments
- Test `attachments.getBinary` — get binary by ID
- Test `attachments.getLink` — get link by ID
- Test `attachments.delete` — delete attachment

### Flow 12: Admin API
- Test `admin.listUsers` — list users (admin only)
- Test `admin.createUser` — create user (admin only)
- Test `admin.banUser` — ban user (admin only)
- Test `admin.unbanUser` — unban user (admin only)
- Test `admin.setRole` — set role (admin only)
- Test `admin.removeUser` — delete user (admin only)
- **Negative test**: Verify non-admin gets 403 on admin endpoints

### Flow 13: Facilities API
- Test `facilities.listOrganizations` — list organizations
- Test `facilities.listSites` — list sites with search
- Test `facilities.getSite` — get site by ID
- Test `facilities.listServiceUnits` — list units with search
- Test `facilities.getServiceUnit` — get unit by ID
- Test `facilities.listPractitioners` — list practitioners
- Test `facilities.getPractitioner` — get practitioner by ID
- Test `facilities.delete` — delete facility entities

### Flow 14: RIPS Reference API
- Test `ripsReference.listTables` — list catalog tables
- Test `ripsReference.listEntries` — list entries by table
- Test `ripsReference.syncAll` — sync catalogs (may be slow)
- Test `ripsReference.syncStatus` — get sync status

### Flow 15: Audit Events API
- Test `auditEvents.create` — create audit event
- Test `auditEvents.list` — list audit events with filters

### Flow 16: Chat API
- Test `POST /api/chat` with valid messages
- Test `POST /api/chat` with selectedPatientId
- Test `POST /api/chat` without authentication (expect 401)
- Verify streaming response headers (Content-Encoding: none, X-Accel-Buffering: no)

## Per-Persona Test Variations

### Admin persona
- Run all flows including Flow 12 (Admin)
- Verify admin endpoints return 200 with admin session

### User persona
- Run all flows EXCEPT Flow 12
- Verify admin endpoints return 403 with user session
- Verify clinical endpoints work correctly

### Unauthenticated
- Test that all protected endpoints return 401 without session
- Test that auth endpoints (sign-in, sign-up) work without session

## Error Handling

- **Validation errors**: oRPC returns Zod validation errors with field-level messages
- **Auth errors**: Better Auth returns structured errors in `{ error: { message, statusText } }`
- **Not found**: Endpoints return 404 for missing resources
- **Forbidden**: Admin endpoints return 403 for non-admin users
- **Database errors**: SQLite errors may return 500 with generic messages

## Known Failure Modes

1. **Dev server not running.** `bun run dev:server` must be running on port 3000. If down, report BLOCKED.
2. **Seed data missing.** Many endpoints expect related data (patients, encounters, practitioners). Run `bun run seed` before API testing.
3. **SQLite write conflicts.** If the server is running during seed, SQLite may throw write conflicts. Stop the server before seeding.
4. **RIPS sync timeout.** `ripsReference.syncAll` fetches data from external SISPRO API and can take 30+ seconds. Increase timeout for this test.
5. **Chat streaming.** The chat endpoint streams responses. Use `--no-buffer` or appropriate curl flags to test streaming.
6. **Session cookie handling.** Better Auth uses httpOnly cookies. Ensure curl preserves cookies across requests with `-c` and `-b` flags.
