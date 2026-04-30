---
name: qa-web
description: >
  QA tests for the WellFit EMR web frontend. Tests authentication, patient management,
  clinical workflows, admin features, and the AI chat assistant via agent-browser.
  Covers the React 19 + Vite + Tanstack Router application running on localhost:3001.
---

# QA Web — WellFit EMR Frontend

## Testing Target

This project has **no preview deployments**. QA must test against a local dev server:

1. Ensure the server is running: `bun run dev:server` (port 3000)
2. Ensure the web app is running: `bun run dev:web` (port 3001)
3. Poll `http://localhost:3001` until it responds with HTTP 200
4. If the dev server cannot start, report ALL web tests as BLOCKED with the specific error

**CRITICAL:** Never fall back to a remote environment. Only localhost with the current branch's code is valid.

## Authentication in CI

The app uses Better Auth with email/password. Credentials are provided via environment variables:

- `QA_ADMIN_PASSWORD` — password for the seed admin account (`seed@wellfit.local`)
- For new user tests, QA creates accounts via the signup form

The auth client is initialized with `baseURL: http://localhost:3000` (the API server).

## App-Specific Configuration Notes

- **UI style**: Square/angular design (`rounded-none`). Components use `@base-ui/react` (shadcn-like).
- **Forms**: All creation forms use `@tanstack/react-form` + Zod validation.
- **Tables**: `DataTable` component with pagination, search, and empty states.
- **Selects**: `SearchSelect` component replaces raw ID inputs — searchable dropdowns for entities.
- **Toast notifications**: Uses `sonner` — toasts appear top-right.
- **Language**: Spanish UI (es-CO locale).
- **Route guards**: `_authenticated.tsx` checks session via `authClient.getSession()` and redirects to `/login` if unauthenticated.
- **Admin guard**: `/admin/users` returns 403/500 for non-admin users — the page shows an access denied message.

## Menu of Available Test Flows

### Flow 1: Authentication
- Navigate to `/login`
- Test sign in with valid credentials (admin)
- Test sign in with invalid credentials (error toast)
- Test sign up with new account
- Test redirect to login when accessing protected route unauthenticated
- Test session persistence across page reloads

### Flow 2: Dashboard
- Verify dashboard loads after login
- Verify stats cards display (patients, encounters, active encounters, professionals)
- Verify recent encounters list
- Verify recent patients list
- Verify quick access links work
- Verify system status indicators

### Flow 3: Patient Management
- Navigate to `/patients`
- Test patient list with pagination
- Test patient search
- Test create patient form (all fields, validation)
- Test patient detail page (`/patients/$patientId`)
- Test edit patient
- Test encounter history on patient detail

### Flow 4: Encounters
- Navigate to `/encounters`
- Test encounter list with filters
- Test create encounter form
- Test encounter detail (`/encounters/$encounterId`)
- Test tabs: diagnoses, allergies, observations, procedures
- Test add diagnosis (CIE10 search select)
- Test add allergy
- Test add observation/vital signs
- Test add procedure (CUPS search select)

### Flow 5: Clinical Documents
- Navigate to `/clinical-documents`
- Test document list
- Test create document form
- Test document detail (`/clinical-documents/$documentId`)
- Test document sections
- Test sign document

### Flow 6: Medication Orders
- Navigate to `/medication-orders`
- Test prescription list
- Test create prescription form
- Test medication administration

### Flow 7: Service Requests
- Navigate to `/service-requests`
- Test service request list
- Test create service request form
- Test diagnostic report modal

### Flow 8: Interconsultations
- Navigate to `/interconsultations`
- Test interconsultation list
- Test create interconsultation form
- Test respond to interconsultation
- Test detail view (`/interconsultations/$interconsultationId`)

### Flow 9: Incapacity Certificates
- Navigate to `/incapacity-certificates`
- Test certificate list
- Test create certificate form
- Test detail view (`/incapacity-certificates/$certificateId`)

### Flow 10: Consents
- Navigate to `/consents`
- Test consent records list
- Test create consent form
- Test data disclosure authorizations tab
- Test create authorization form
- Test revoke consent/authorization

### Flow 11: Attachments
- Navigate to `/attachments`
- Test attachment list
- Test create binary object
- Test create attachment link
- Test detail view (`/attachments/$attachmentId`)

### Flow 12: Admin User Management
- Navigate to `/admin/users`
- Test user list with search
- Test create user form
- Test ban/unban user
- Test change user role
- Test delete user
- **Negative test**: Verify non-admin user sees access denied message

### Flow 13: Catalogs
- Navigate to `/catalogs`
- Test catalog table list
- Test catalog entries (`/catalogs/$tableName`)
- Test search/filter within catalog

### Flow 14: AI Chat
- Navigate to `/chat`
- Test chat interface loads
- Test patient selection/search
- Test sending a message
- Test streaming response
- Test tool call visualization
- Test quick actions
- Test new chat button

### Flow 15: Facilities
- Navigate to `/facilities/organizations`
- Test organizations list
- Navigate to `/facilities/sites`
- Test sites list and detail (`/facilities/sites/$siteId`)
- Navigate to `/facilities/service-units`
- Test service units list and detail (`/facilities/service-units/$unitId`)
- Navigate to `/facilities/practitioners`
- Test practitioners list and detail (`/facilities/practitioners/$practitionerId`)

### Flow 16: Audit Events
- Navigate to `/audit-events`
- Test audit log list with filters

## Per-Persona Test Variations

### Admin persona
- Run all flows including Flow 12 (Admin)
- Verify admin can access all routes

### User persona
- Run all flows EXCEPT Flow 12
- Verify user CANNOT access `/admin/users` (should see access denied)
- Verify user CAN access all clinical workflows

### New user persona
- Run Flow 1 (signup)
- Run Flow 2 (dashboard with empty states)
- Run Flow 3 (create first patient)
- Verify empty states display correctly

## Error Handling

- **Auth errors**: Better Auth returns errors in `error.error.message` — displayed as toast
- **Form validation**: Zod validation shows inline error messages below fields
- **API errors**: Displayed as toast notifications via sonner
- **Loading states**: Skeleton loaders on dashboard, `Loader` component on forms
- **Empty states**: `DataTable` shows empty title/description when no data

## Known UI Quirks

1. **SearchSelect dropdown**: The dropdown opens below the input. When testing, wait for the dropdown to appear before clicking an option.
2. **Toast notifications**: Toasts auto-dismiss after a few seconds. Capture evidence before they disappear.
3. **Modal dialogs**: Some actions open modals (e.g., diagnostic reports). Verify the modal backdrop appears and closes correctly.
4. **Spanish labels**: All UI text is in Spanish. Use Spanish labels for selectors:
   - "Iniciar sesion" = Sign in
   - "Registrarse" = Sign up
   - "Guardar" = Save
   - "Cancelar" = Cancel
   - "Buscar" = Search
   - "Nuevo" = New
   - "Eliminar" = Delete
5. **Square design**: No rounded corners (`rounded-none`). Buttons, inputs, cards are all angular.
6. **Session check**: The `_authenticated` layout checks session on every route load. If session expires mid-test, redirect to `/login` occurs.

## Known Failure Modes

1. **Dev server not running.** Both `bun run dev:server` and `bun run dev:web` must be running. If either is down, report BLOCKED.
2. **Seed data missing.** The app expects seed data for realistic testing. Run `bun run seed` before QA if the database is empty.
3. **SQLite write conflict.** If the server is running during seed, SQLite may throw write conflicts. Stop the server before seeding.
4. **Better Auth session cookie issues.** The app uses `sameSite: none` and `secure: true`. In local testing, ensure the browser context handles cookies correctly.
5. **Chat streaming timeout.** The chat endpoint has `idleTimeout: 120` on the server, but LLM responses can take 10-30 seconds. Increase wait timeouts for chat tests.
