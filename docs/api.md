# Normalized API Contract

All normalized endpoints require a valid NextAuth session. Error responses use `{ "error": string, "code": string }`.

## Roles

| Role | Board access | Tasks and comments | Projects, columns, and members |
| --- | --- | --- | --- |
| `owner` | Read | Create, update, move, delete | Full workspace administration |
| `admin` | Read | Create, update, move, delete | Manage projects, columns, and members |
| `member` | Read | Create, update, move, delete permitted work | No workspace administration |
| `viewer` | Read | No mutations | No workspace administration |

## Workspace Endpoints

### `GET /api/workspaces`

Provisions a first-time signed-in user with an owner workspace, default project, and standard board columns. Returns the caller's workspace memberships.

Successful response:

```json
{
  "workspaces": [
    { "id": "uuid", "slug": "workspace-abc123", "name": "User's workspace", "role": "owner" }
  ]
}
```

### `GET /api/workspaces/{workspaceId}/board`

Returns a stable flat response of `projects`, `columns`, and at most 1,000 `tasks` only when the caller is a member of `workspaceId`. Fields use database UUIDs and normalized lower-case task priority values. Cursor pagination must replace this bound before supporting boards larger than 1,000 tasks.

Errors:

| Status | Code | Meaning |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | The request has no authenticated session. |
| `400` | `INVALID_WORKSPACE_ID` | The route parameter is not a UUID. |
| `404` | `WORKSPACE_NOT_FOUND` | The workspace does not exist or the caller is not a member. |
| `503` | `WORKSPACE_BOARD_UNAVAILABLE` | The database could not complete the request. |

## Planned Mutation Endpoints

| Endpoint | Input schema | Required role |
| --- | --- | --- |
| `POST /api/projects/{projectId}/tasks` | `createTaskSchema` | owner, admin, member |
| `PATCH /api/tasks/{taskId}` | `updateTaskSchema` | owner, admin, member |
| `POST /api/tasks/{taskId}/move` | `moveTaskSchema` | owner, admin, member |
| `DELETE /api/tasks/{taskId}` | none | owner, admin, member |
| `POST /api/tasks/{taskId}/comments` | `createCommentSchema` | owner, admin, member |
| `PATCH /api/comments/{commentId}` | `updateCommentSchema` | comment author, admin, owner |

All future task and comment mutations must enforce workspace membership before reading or writing the target record.