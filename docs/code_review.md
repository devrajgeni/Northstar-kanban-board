# Code Review — Kanban Board

**Scope reviewed:** [app/page.tsx](../app/page.tsx), [app/page.test.tsx](../app/page.test.tsx), [app/layout.tsx](../app/layout.tsx), [app/globals.css](../app/globals.css), [package.json](../package.json), [jest.config.js](../jest.config.js), [jest.setup.ts](../jest.setup.ts), [tsconfig.json](../tsconfig.json)

**Summary:** This is a client-only Next.js/React demo (no backend, no persisted data beyond theme/font in `localStorage`). The feature set is broad and the test suite (`page.test.tsx`) gives good behavioral coverage. The main risks are architectural (a single ~700-line component with unformatted, minified-looking JSX) and a handful of correctness/accessibility gaps rather than security vulnerabilities, since there is no server, auth, or data persistence layer.

---

## High priority

### 1. Data model inconsistency between `assignee` and `assignees`
`Task` stores both a legacy singular `assignee`/`initials`/`color` and a plural `assignees: Assignee[]`. [toggleTaskAssignee()](../app/page.tsx#L336) only updates the `assignees` array, but the assignee filter (`assigneeOptions`, `activeAssignees` in [page.tsx](../app/page.tsx#L240)) still reads the singular `task.assignee` field. After a user adds/removes assignees from the issue modal, the "Assignee" filter list and filtering logic silently go stale and no longer reflect the task's actual assignees.
**Recommendation:** Drop the redundant singular fields (derive them from `assignees[0]` where needed) or keep both in sync inside `toggleTaskAssignee`.

### 2. Unvalidated email interpolated into a `mailto:` URL
In [invitePerson()](../app/page.tsx#L280-L298), `inviteEmail` is checked against a loose regex (`/^\S+@\S+\.\S+$/`) and then interpolated directly, unencoded, into `mailto:${email}?subject=...&body=...`. Since `\S` allows characters like `&`, `?`, `#`, a value such as `a@b.com?cc=someone@else.com` passes validation and lets the input inject extra `mailto:` parameters (e.g. additional recipients). Low impact here since it only affects the local user's own mail client, but it's a URL/header-injection pattern worth fixing before this logic is ever reused server-side.
**Recommendation:** `encodeURIComponent(email)` before interpolating, and/or tighten the validation regex.

### 3. Non-functional / dead UI controls
- The column header "Options" button (`aria-label="Options for ${column.name}"`, [page.tsx](../app/page.tsx#L527)) has no `onClick` — it renders and is focusable but does nothing.
- The inbox "Mark as read" button (`aria-label="Mark ${item.title} as read"`) similarly has no handler.

These affect real users (they look actionable) and will also confuse anyone relying on ARIA labels (screen-reader users in particular).
**Recommendation:** Wire these up or remove them until implemented.

---

## Medium priority

### 4. Single 700+ line component with unformatted JSX
Nearly the entire app lives in one `Home()` function in [page.tsx](../app/page.tsx), and large sections of JSX are written as single, very long lines (multiple 2,000+ character lines observed). This makes diffs, code review, and reasoning about re-renders very difficult, and increases the risk of regressions since there's no component boundary to isolate changes (e.g., the issue modal, board column, and sidebar are all inline).
**Recommendation:** Extract components (e.g. `Sidebar`, `KanbanColumn`, `TaskCard`, `IssueModal`, `SettingsModal`) into separate files under `app/components/`, and run Prettier so JSX is reformatted onto multiple lines.

### 5. Inconsistent modal accessibility
Some modals (`infoModal`, `selectedTask` issue modal, `showInviteModal`, `showProfileModal`, `showSettingsModal`) have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. Others (`showModal` "Add task", `showNewTeamModal`, `showShareModal`, `viewingPerson`) have none of these. Only the `infoModal` implements focus trapping / focus restore (see the `useEffect` at [page.tsx](../app/page.tsx#L211-L233)); the rest don't trap focus or close on <kbd>Escape</kbd>.
**Recommendation:** Extract a single reusable `Modal` component that always sets `role="dialog"`, `aria-modal`, focus trap, and Escape-to-close, then use it everywhere instead of duplicating backdrop/`stopPropagation` markup per modal.

### 6. React list keys use mutable/non-unique fields
Several lists key on `name`/`title` instead of a stable id: `key={team.name}`, `key={person.name}`, `key={item.title}` (inbox notifications), `key={project}` (project nav). If two people share a name, two projects share a name transiently during rename, or two notifications share a title, React will misidentify list items and can produce stale DOM/state bugs.
**Recommendation:** Add stable `id` fields to `Person`, `Team`, and inbox item types and key on those instead of display text.

### 7. `Date.now()` used for task/comment IDs
[addTask()](../app/page.tsx#L459) and [addComment()](../app/page.tsx#L322) use `Date.now()` as an id. Two rapid actions (e.g., a fast double-click, or two tests running in the same millisecond) can produce duplicate ids, which combined with issue #6 (key-by-identity assumptions elsewhere) can cause subtle bugs.
**Recommendation:** Use a monotonic counter or `crypto.randomUUID()`.

### 8. `deleteProject` destructures an intentionally-unused variable
```ts
const { [project]: removedProject, ...updatedProjectDetails } = activeTeam.projectDetails;
```
`removedProject` is never used — this is a valid pattern for omitting a key, but without an ESLint config (see #10) or a `_`-prefix / disable comment, it reads as dead code and will trip up default lint rules (`no-unused-vars`) if linting is ever added.
**Recommendation:** Rename to `_removedProject` or add a `// eslint-disable-next-line` once linting is configured.

---

## Low priority / polish

### 9. Weak/loose typing in a few places
- `type Project = string;` and `type Comment.id: number` provide no more safety than plain `string`/`number` — fine for a small app, but worth noting if the domain grows (e.g., a real `ProjectId` brand type would catch mixing project names across teams).
- `page.test.tsx` starts with `// @ts-nocheck`, disabling type checking for the entire test file, which removes a safety net for typos in queries/props (e.g., wrong `screen.getByRole` args wouldn't be caught at compile time).
**Recommendation:** Remove `@ts-nocheck` and fix any resulting type errors; they're usually trivial in RTL tests.

### 10. No ESLint configuration and no CI workflow
There is no `.eslintrc*`/flat `eslint.config.*` and no `.github/workflows`. `npm test` (Jest) is the only automated check, and it has to be run manually.
**Recommendation:** Add `next lint`/ESLint config and a CI workflow (e.g., GitHub Actions) that runs `npm test` and `next build` on push/PR to catch regressions automatically.

### 11. Dependency hygiene
`package.json` pins Next.js as `^14.2.15`. Next.js 14 has had security patches since (e.g., middleware-related advisories); this app doesn't use `middleware.ts` so exposure is low, but the caret range means the exact installed version depends on `package-lock.json` at install time. Worth periodically running `npm audit` / bumping to the latest 14.x patch and re-checking after any future middleware/auth additions.

### 12. Redundant/duplicated CSS
[globals.css](../app/globals.css) has some rules for `.task-card`, `.project-options-button`, `.task-options-menu`, etc. defined more than once across the file with overlapping selectors (e.g. `.task-card { ... }` appears twice with different property sets). Not a functional bug given cascade order, but it makes the stylesheet harder to maintain — consider consolidating into fewer, better-organized blocks (or a CSS Modules / Tailwind approach) since the file is already large and hand-written.

### 13. Client-side-only state, no error handling boundaries
All app state is in-memory (`useState`) and resets on refresh except theme/font. There's no `ErrorBoundary`/`error.tsx` for the App Router, so an unexpected render error anywhere in this large component will blank the whole page. Given the component's size (#4), adding an `app/error.tsx` boundary would reduce blast radius.

---

## What's working well
- Good, readable test coverage in [page.test.tsx](../app/page.test.tsx) covering happy paths, fail cases, and edge cases (empty input, duplicate names, case-insensitive search, etc.).
- No use of `dangerouslySetInnerHTML`, `eval`, or other direct XSS vectors — all dynamic content is rendered through normal JSX text interpolation, which is auto-escaped by React.
- Reasonable use of controlled inputs throughout, and consistent `aria-label`s on most icon-only buttons.
- The `infoModal` focus-trap implementation ([page.tsx](../app/page.tsx#L211-L233)) is a solid, correct pattern that should be the template for the other modals (see #5).
- Theming/font system is a nice touch and persists correctly via `localStorage` with validation against the known `THEMES`/`FONTS` id lists before applying saved values.
