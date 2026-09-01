# Production Delivery Plan

## Purpose

This is the execution checklist for converting the current Next.js Kanban demo into a deployable, multi-tenant application backed by Neon Postgres. Execute sections in order. Do not start the next section until every required check in the current section passes.

## Current State

- [x] Next.js 14 application with NextAuth route protection.
- [x] Neon Postgres configured through `DATABASE_URL`.
- [x] Temporary per-user task snapshot persistence in `user_board_states`.
- [x] Normalized schema migration for users, workspaces, memberships, projects, columns, tasks, comments, labels, invitations, and audit events.
- [x] `npm run db:migrate` applies committed migrations in order.
- [x] `GET /api/workspaces` provisions and lists the signed-in user's workspace.
- [x] `GET /api/workspaces/{workspaceId}/board` reads a membership-authorized normalized board.
- [x] GitHub Actions validates tests and production build.
- [ ] The React board uses normalized APIs. It still uses the temporary snapshot API.
- [ ] Task, comment, project, membership, and invitation mutations do not exist yet.
- [ ] The application is not deployed to Vercel yet.

## Operating Rules

- [ ] Never commit `.env.local`, database URLs, provider secrets, access tokens, or passwords.
- [ ] Keep secrets server-only. Do not use `NEXT_PUBLIC_` for `DATABASE_URL` or `NEXTAUTH_SECRET`.
- [ ] Run `npm run db:migrate` after pulling a migration change and before testing database-backed behavior.
- [ ] Every normalized read and write must identify the session user and enforce `workspace_memberships` authorization.
- [ ] Use UUIDs from the database for normalized resources. Never use display names as identifiers.
- [ ] Validate every API request body with Zod before database access.
- [ ] Add a focused test for each authorization rule and business mutation.
- [ ] Keep changes backward-compatible while the temporary `user_board_states` route remains in use.

## Phase 0: Local Environment and Security

- [x] Rotate the Neon connection password because it was exposed during development. Update `DATABASE_URL` only in `.env.local` and Vercel environment variables.
- [x] Generate a new `NEXTAUTH_SECRET` locally and keep exactly one `NEXTAUTH_SECRET` entry in `.env.local`.
- [x] Confirm required local configuration is present: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DEMO_USER_EMAIL`, and `DEMO_USER_PASSWORD`.
- [x] Run `npm run db:migrate`.
- [x] Run `npm test -- --runInBand`.
- [x] Run `npm run build`.

**Exit criteria:** migrations, tests, and production build pass; the user can sign in locally; a task persisted through the temporary board route survives refresh.

## Phase 1: Establish API Contracts

- [x] Create a `lib/api` or `lib/contracts` module containing shared request/response schemas for normalized API routes.
- [x] Define a stable error response shape: `{ error: string, code: string }`.
- [x] Define `WorkspaceRole` as `owner`, `admin`, `member`, or `viewer`.
- [x] Define DTOs for workspace, project, board column, task, comment, member, and invitation.
- [x] Define request schemas for create task, update task, move task, create comment, and update comment.
- [x] Define permission rules: owner/admin manage workspace; member creates and edits tasks/comments; viewer reads only.
- [x] Document each route, input, response, allowed roles, and error conditions in this file or `docs/api.md`.

**Verification:** `npm run build` passes and schema unit tests cover invalid inputs.

## Phase 2: Workspace and Board Read APIs

- [x] Refactor `lib/workspaces.ts` so provisioning uses a transaction or an idempotent database function to prevent concurrent first-login duplicates.
- [x] Add `GET /api/workspaces` response tests for signed-out, first sign-in, and existing-member cases.
- [x] Add `GET /api/workspaces/{workspaceId}/board` response tests for owner/member, viewer, unrelated user, invalid UUID, and nonexistent workspace cases.
- [x] Add an explicit workspace bootstrap route only if automatic first-login provisioning is not the desired product behavior. Automatic first-login provisioning is the selected product behavior.
- [x] Return columns grouped with their tasks, or document the normalized flat response and keep it stable.
- [x] Include only fields the browser needs; never return invitation token hashes or internal audit metadata.
- [x] Add pagination or a bounded task limit before allowing large boards.

**Verification:** a signed-in user receives one workspace, its default project and four columns; a user without membership receives `404` for another workspace ID. Workspace bootstrap was verified locally for the demo account.

**Phase 2 status:** complete. The normalized workspace and board read APIs have session, UUID, membership, bounded-response, and route-level test coverage.

## Phase 3: Normalized Task APIs

- [x] Add `POST /api/projects/{projectId}/tasks` for `owner`, `admin`, and `member` roles.
- [x] Validate title, description, priority, due date, labels, and optional assignees with Zod.
- [x] Resolve the project workspace and authorize membership before inserting a task.
- [x] Compute a deterministic task position at the end of the requested column.
- [ ] Add `PATCH /api/tasks/{taskId}` for permitted task fields.
- [ ] Require the expected task `version` for update operations and return `409` when another update has won.
- [ ] Increment `version` and update `updated_at` for each successful task update.
- [x] Add `POST /api/tasks/{taskId}/move` with target column, target position, and expected version.
- [x] Make task movement transactional and preserve unique ordering within each column.
- [ ] Add `DELETE /api/tasks/{taskId}` for `owner`, `admin`, and permitted `member` roles.
- [ ] Write an `audit_events` record for each task creation, update, move, and delete operation.
- [ ] Return typed task DTOs from every mutation.

**Verification:** create, edit, move, and delete work after refresh; viewers receive `403`; cross-workspace IDs never expose or mutate data; concurrent version tests return `409` for stale writes.

## Phase 4: Comments, Labels, and Assignees

- [x] Add `POST /api/tasks/{taskId}/comments` for authorized non-viewer members.
- [x] Add `PATCH /api/comments/{commentId}` and permit only the comment author, admin, or owner.
- [x] Add comment deletion with the same authorization policy.
- [ ] Add task-assignee mutation routes and ensure assignees are members of the same workspace.
- [ ] Add label creation/listing and task-label mutation routes scoped to the workspace.
- [ ] Add audit events for comment moderation and assignment changes where required.
- [ ] Add tests for author-only comment editing and invalid cross-workspace assignee/label requests.

**Verification:** comments, labels, and assignments persist and reload from normalized tables; unauthorized requests fail without partial writes.

## Phase 5: Projects, Columns, and Workspace Administration

- [ ] Add project create, update, and delete APIs for owner/admin roles.
- [ ] Add column create, rename, reorder, and delete APIs for owner/admin roles.
- [ ] Define a safe policy for deleting a non-empty column: reject, move tasks to a target column, or archive tasks.
- [ ] Add member listing API with role information.
- [ ] Add invitation create, list, revoke, and accept APIs.
- [ ] Generate invitation tokens with `crypto.randomBytes`; store only their hashes in `workspace_invitations`.
- [ ] Add role-change and member-removal APIs with owner-protection rules.
- [ ] Add complete authorization and audit tests for all workspace administration actions.

**Verification:** owner/admin/member/viewer permissions match the documented rules and all sensitive workspace changes produce audit records.

## Phase 6: Migrate the React Board

- [ ] Extract the large board page into focused components before replacing its data source: sidebar, board, column, task card, task dialog, project dialog, and member/invitation dialogs.
- [ ] Introduce a typed browser API client; do not scatter raw `fetch` calls throughout components.
- [ ] Load workspaces from `GET /api/workspaces` after authentication.
- [ ] Load board data from `GET /api/workspaces/{workspaceId}/board` for the selected workspace/project.
- [ ] Replace `Task.id: number` and date-based IDs with API UUIDs.
- [ ] Keep only transient state in React: open dialogs, selected entity, drag state, filters, theme, and font.
- [ ] Replace each local `setTasks` mutation with the matching normalized API mutation.
- [ ] Implement optimistic task movement with server reconciliation and rollback on failure.
- [ ] Add visible loading, empty, unauthorized, conflict, and save-error states.
- [ ] Remove automatic writes to `PUT /api/board` only after all board task mutations use normalized APIs.
- [ ] Keep `GET /api/board` read fallback until a migration test confirms all users have normalized board data.

**Verification:** user-visible create/edit/move/delete/comment/assignment operations work through normalized APIs; page refresh reproduces the database state; a forced failed request restores optimistic UI state.

## Phase 7: Data Migration and Snapshot Retirement

- [ ] Write a one-off, idempotent migration utility that reads `user_board_states` and creates a selected workspace/project/columns/tasks/comments in normalized tables.
- [ ] Dry-run the migration against a Neon branch and report row counts without writing changes.
- [ ] Back up `user_board_states` before production migration.
- [ ] Run the migration once for each existing demo user.
- [ ] Verify task counts, title samples, comments, and columns match the old snapshot.
- [ ] Remove client writes to the snapshot endpoint.
- [ ] Monitor for one release cycle.
- [ ] Remove `GET`/`PUT /api/board`, `lib/boardState.ts`, and `user_board_states` only after confirmed normalized usage.

**Verification:** migrated data matches source snapshots; no production client calls the retired route; task data remains available after snapshot removal.

## Phase 8: Authentication and Production Security

- [ ] Replace demo credentials with a production identity provider such as Microsoft Entra ID, Auth0, Clerk, or a properly implemented passwordless/password system.
- [ ] If passwords are supported, use Argon2id hashes, email verification, password reset, MFA/passkeys, and an account recovery policy.
- [ ] Replace the in-memory login limiter in `lib/rateLimit.ts` with Redis-backed rate limiting before horizontal scaling.
- [ ] Add secure HTTP headers, Content Security Policy, and production-only secure cookies.
- [ ] Confirm NextAuth callback URLs, allowed origins, and provider redirect URLs for local, preview, and production environments.
- [ ] Add input-size limits and request rate limits to mutation routes.
- [ ] Review all endpoints for tenant isolation and IDOR vulnerabilities.
- [ ] Add dependency scanning and secret scanning to CI.

**Verification:** identity-provider sign-in works in preview and production; rate limits work across instances; security review confirms cross-workspace isolation.

## Phase 9: Quality, Observability, and Operations

- [ ] Add `app/error.tsx`, `app/not-found.tsx`, and route-level loading states.
- [ ] Add ESLint and Prettier with scripts and CI enforcement.
- [ ] Add database integration tests using an isolated Neon branch or Testcontainers Postgres.
- [ ] Add end-to-end tests for sign-in, workspace isolation, task lifecycle, and invitation acceptance.
- [ ] Add structured server logs with request IDs; avoid logging tokens, passwords, connection strings, or private task content unnecessarily.
- [ ] Add error tracking and performance monitoring, such as Sentry plus OpenTelemetry-compatible tracing.
- [ ] Configure Neon backups/point-in-time restore and document restore ownership and procedure.
- [ ] Add a health/readiness endpoint that does not leak configuration or database data.
- [ ] Decide whether attachments are needed; if so, use object storage and signed URLs, not the application filesystem.

**Verification:** CI runs unit, integration, end-to-end, lint, formatting, and build checks; an intentional test exception reaches error monitoring; restore procedure is documented and tested.

## Phase 10: Vercel Preview Deployment

- [ ] Push the branch and confirm the GitHub Actions workflow is green.
- [ ] Import the repository into Vercel with standard Next.js build settings.
- [ ] Create a separate Neon branch/database for preview, or explicitly accept preview data sharing with development.
- [ ] Add Preview environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` during demo-auth phase, and identity-provider variables when enabled.
- [ ] Deploy once and record the generated preview URL.
- [ ] Set `NEXTAUTH_URL` to that exact preview URL with no trailing slash.
- [ ] Redeploy after changing `NEXTAUTH_URL`.
- [ ] Run the smoke test below against the preview deployment.

**Preview smoke test:** sign in; create/edit/move/delete a task; refresh; verify persistence; verify a viewer cannot mutate; verify an unrelated workspace ID returns `404`; inspect browser console and server logs for errors.

## Phase 11: Production Deployment

- [ ] Create/confirm a dedicated Neon production branch/database and apply `npm run db:migrate` using production credentials.
- [ ] Configure Vercel Production environment variables with production-only values.
- [ ] Set `NEXTAUTH_URL` to the final HTTPS production domain with no trailing slash.
- [ ] Configure the custom domain, DNS, and identity-provider redirect URLs.
- [ ] Re-run the full CI suite from the release commit.
- [ ] Deploy the release commit to Vercel Production.
- [ ] Run the production smoke test with a non-admin test account.
- [ ] Verify error monitoring, audit events, database connectivity, and backup configuration.
- [ ] Record release version, deployment URL, migration version, rollback owner, and rollback procedure.

**Production smoke test:** sign in; create a workspace/project/task if authorized; edit and move a task; refresh; add/edit a comment; verify unauthorized mutations fail; verify no secrets are present in client network responses or browser bundles.

## Release Definition of Done

- [ ] All current and new CI checks pass.
- [ ] Normalized APIs, not `user_board_states`, own production task data.
- [ ] Workspace authorization is verified for all reads and writes.
- [ ] Deployment uses server-only secret configuration.
- [ ] Production database migrations are applied and verified.
- [ ] Monitoring, backups, and rollback instructions are operational.
- [ ] Preview and production smoke tests pass.