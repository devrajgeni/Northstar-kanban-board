# Normalized Workspace Schema

`002_create_workspace_schema.sql` is an additive migration for the multi-user application. It does not read from or remove `user_board_states`, so the current deployed demo continues to work while the next API is built.

## Apply the migration

Run `npm run db:migrate` to apply the complete migration set to the database configured as `DATABASE_URL`. Alternatively, run the complete contents of `db/migrations/002_create_workspace_schema.sql` in the Neon SQL Editor. Verify the migration with:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'workspaces', 'workspace_memberships', 'projects', 'board_columns', 'tasks', 'comments')
ORDER BY table_name;
```

## Transition plan

1. Create server-side workspace bootstrap logic for a signed-in user and add the `owner` membership in the same transaction.
2. Use `GET /api/workspaces` to provision and list the authenticated user's workspaces, then use `GET /api/workspaces/{workspaceId}/board` to read a membership-authorized normalized board.
3. Replace the temporary `GET` and `PUT /api/board` snapshot route with task, project, column, and comment APIs.
4. Update the React board to use UUID-based server records; retain only visual state, filters, dialogs, and drag state in the browser.
5. Migrate any desired demo snapshot data into a selected workspace.
6. Remove `user_board_states` only after the normalized APIs are live and migration data has been verified.

## Authorization rule

Every query must be scoped to an authorized `workspace_id`. Every mutation must load and check the actor's `workspace_memberships` role in its transaction. IDs alone must never grant access.