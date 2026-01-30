# githulu — Local-First Git Desktop App (Electron + Nuxt/Vue) — Specification

> **Goal:** Build a Tower-like Git desktop app for macOS called **githulu**.  
> **Non-goal:** Recreate all features of Tower. Focus on the daily workflow: repo organization, fetch/status, push/publish, branches, rebase-with-conflicts, and diffs.  
> **Core constraint:** The app is **local-first**: it runs entirely on a user’s Mac and does **not** require internet for databases/services. It may interact with Git remotes only when the user performs Git remote operations (e.g., fetch/push).

---

## 1. Product Summary

**githulu** is a lightweight, elegant Git client for macOS that uses the system Git installation. It provides a clean Tower-like UI with:

- Add and manage local repositories
- Group repositories and drag/drop reorder
- Fetch origin and refresh local status (ahead/behind)
- Publish/push branches
- Rebase instead of merge flow with conflict visibility and per-file “resolved” checkmark behavior (stage file + rebase continue)
- Working copy file list with diff pane on the right
- Branch tracking and branch creation

---

## 2. Guiding Principles

1. **Fast UI:** UI must never block waiting for Git. Render cached state immediately and update as operations complete.
2. **Local-first:** No external database or server. Store app data locally.
3. **Safe architecture:** Renderer has no direct filesystem or child process access. All privileged operations happen in Electron main process via a minimal IPC surface.
4. **Beautiful + simple:** Minimal friction flow. Layout mimics Tower for familiarity.
5. **System Git:** Use `/usr/bin/git` or discovered `git` in PATH. Do not bundle libgit2.

---

## 3. Target Platform

- macOS (primary)
- App should run locally as a packaged `.app` (DMG/ZIP) and in dev mode (Nuxt dev server + Electron).

---

## 4. Tech Stack

- **Desktop:** Electron
- **UI:** Nuxt 3 (Vue 3) + Pinia
- **Styling:** Tailwind CSS (or UnoCSS) with a minimal component library
- **Diff Viewer:** start simple with unified diff rendering; optionally adopt Monaco later
- **Persistence:** start with JSON file in Electron `app.getPath("userData")`; optional later upgrade to SQLite
- **Git Execution:** `child_process.spawn` in main process only
- **Watchers:** `chokidar` (or native fs watchers) in main process

---

## 5. UX / Layout Requirements

The overall layout should remain extremely similar to Git Tower:

- **Left Sidebar**
  - Repo groups
  - Repos within groups
  - Drag/drop reorder repos within group and between groups
  - Repo search/filter (optional but recommended)

- **Center Pane**
  - Top: repo summary (current branch, ahead/behind, dirty indicator)
  - Working Copy view:
    - Staged changes
    - Unstaged changes
    - Untracked files
    - Conflicts section during rebase
  - Branches view:
    - Local branches
    - Remote branches
    - Tracking status

- **Right Pane**
  - Diff viewer for selected file
  - During rebase conflicts: show conflict guidance and quick actions

### Key UX behaviors

- Selecting a file immediately shows diff in right pane (from cache if available, otherwise show loading skeleton, then render diff).
- Fetch/push/rebase operations show progress in a small drawer or unobtrusive status area.
- Errors must be human-readable, with “Show details” to reveal stderr.

---

## 6. Core Features (Must-Haves)

### 6.1 Repository Management

A) **Add local repository**

- User selects a folder
- Validate it is a Git repo
- Normalize to repo root
- Add to registry and show in sidebar

B) **Repo groups and drag/drop organization**

- Create/rename/delete groups
- Drag repositories between groups
- Reorder repositories within group

### 6.2 Sync + Status

C) **Fetch origin**

- Fetch remote updates with prune
- Update remote refs and branch list

D) **Refresh local repo status (ahead/behind)**

- Show current branch
- Show ahead/behind relative to upstream (if set)
- Show working tree changes (staged/unstaged/untracked)
- Must remain responsive: cached state first, refresh second

### 6.3 Push / Publish

E) **Publish and/or push to a branch**

- Publish: push with `-u` to set upstream
- Push: push to origin for current branch

### 6.4 Rebase Flow (Rebase Instead of Merge)

F) **Rebase with conflict visualization and per-file resolution checkmarks**

- Toggle/option: “Use rebase instead of merge”
- Rebase operation initiates onto a specified base (e.g., `origin/main`)
- On conflict:
  - UI lists conflicted files
  - User opens files in Cursor (external editor) to resolve
  - User clicks a checkmark next to file to mark it handled:
    - This stages the file (\`git add <file>\`)
  - Then user clicks “Continue rebase”
- Must support:
  - Continue rebase
  - Abort rebase
  - Detect rebase in progress

### 6.5 Diff Pane

G) **Diff view in right pane when selecting a changed file**

- Must handle:
  - unstaged diff
  - staged diff
  - optionally: committed diff when selecting commit (phase 2)

### 6.6 Branch Management

I) **Track remote branches and create local branches**

- List local + remote branches
- Create a new local branch from a base
- Track remote branch locally (create local branch with tracking)
- Switch branches (optional but strongly recommended for usability)

---

## 7. Non-Goals (For MVP)

- Pull request integration
- GitHub/GitLab auth flows
- Submodule management
- Stash UI
- Complex merge tool
- Interactive rebase editor UI (beyond basic continue/abort/conflicts list)
- Blame view
- Advanced history graph visualization (simple log list is fine later)

---

## 8. Local-Only Data + Storage

### Storage location

Use \`app.getPath("userData")\`, e.g.:

- \`~/Library/Application Support/githulu/githulu.json\`

### Data model (JSON)

**Important:** The markdown preview can break if triple-backticks appear inside a fenced block.  
Therefore, the example JSON below is shown as an indented code block (not fenced).

    {
      "version": 1,
      "groups": [
        { "id": "grp_default", "name": "Default", "repoIds": ["repo_1", "repo_2"] }
      ],
      "repos": [
        { "id": "repo_1", "path": "/Users/me/code/project-a", "displayName": "project-a" }
      ],
      "ui": {
        "selectedRepoId": "repo_1",
        "selectedView": "workingCopy",
        "sidebarWidth": 280
      }
    }

### Notes

- Repo groups are metadata-only and must not modify repositories.
- Keep migrations simple via \`version\`.

---

## 9. Electron Security Requirements

- \`contextIsolation: true\`
- \`nodeIntegration: false\`
- Use a **preload script** to expose a strict IPC API via \`contextBridge\`.
- Do **not** expose any generic “execute command” IPC.
- Validate all inputs in main process (repo IDs map to known repo paths, sanitize file paths).

---

## 10. Git Execution Strategy (Main Process)

### Resolve Git binary

- Prefer \`/usr/bin/git\` if available.
- Otherwise resolve via \`which git\` at startup.
- Cache resolved path.

### Spawn rules

- Use \`child_process.spawn(gitPath, args, { cwd: repoRoot })\`
- Never use \`exec\` with shell strings.
- Capture stdout/stderr as text.
- Add operation timeouts (configurable; default 60s for status/diff, longer for fetch/rebase/push).
- Support cancellation (store process handles and allow kill).

### Concurrency model

- **Per-repo operation queue** to avoid lock collisions:
  - status/diff high priority
  - fetch/push/rebase medium
  - log/branch listing low
- Allow multiple repos to process simultaneously, but limit global concurrency (e.g., 3 active git procs).

---

## 11. Status + Conflict Detection

### Preferred: porcelain v2

Use:

- \`git status --porcelain=v2 -b\`

Parse for:

- branch name
- upstream
- ahead/behind
- file changes with XY status codes
- conflict markers (e.g., \`UU\`, etc.)

### Rebase detection

Detect rebase in progress via:

- \`.git/rebase-merge/\` or \`.git/rebase-apply/\` existence
- Or by parsing \`git status\` output that indicates rebase state

### Conflict files list

From porcelain entries, gather files with unmerged statuses:

- \`UU\`, \`AA\`, \`DD\`, \`AU\`, \`UA\`, \`DU\`, \`UD\`

UI must surface these in a “Conflicts” section.

---

## 12. Git Command Mapping (MVP)

### Validate repo + root

- \`git -C <path> rev-parse --is-inside-work-tree\`
- \`git -C <path> rev-parse --show-toplevel\`

### Status

- \`git -C <repo> status --porcelain=v2 -b\`

### Fetch

- \`git -C <repo> fetch origin --prune\`

### Ahead/behind (optional fallback)

- \`git -C <repo> rev-list --left-right --count HEAD...@{upstream}\`

### Diff

- Unstaged: \`git -C <repo> diff -- <file>\`
- Staged: \`git -C <repo> diff --cached -- <file>\`

### Push / Publish

- Push: \`git -C <repo> push origin <branch>\`
- Publish: \`git -C <repo> push -u origin <branch>\`

### Branches

- \`git -C <repo> branch --all --verbose\`

### Create branch

- \`git -C <repo> switch -c <name> <from>\`

### Track remote branch

- \`git -C <repo> switch -c <localName> --track origin/<remoteName>\`

### Rebase flow

- Start: \`git -C <repo> rebase <onto>\`
- Continue: \`git -C <repo> rebase --continue\`
- Abort: \`git -C <repo> rebase --abort\`
- Mark file resolved (checkmark): \`git -C <repo> add <file>\`

---

## 13. IPC Contract (Renderer \u2194 Main)

### IPC naming conventions

- Requests: \`githulu:<domain>:<action>\`
- Events: \`githulu:event:<name>\`

### API exposed to renderer (preload)

Expose a single object:

- \`window.githulu\`

With submodules:

- \`window.githulu.repos\`
- \`window.githulu.git\`
- \`window.githulu.events\`

#### repos methods

- \`list(): Promise<{ groups, repos, ui }>\`
- \`add(path: string): Promise<{ repo }>\`
- \`remove(repoId: string): Promise<void>\`
- \`createGroup(name: string): Promise<{ group }>\`
- \`renameGroup(groupId: string, name: string): Promise<void>\`
- \`deleteGroup(groupId: string): Promise<void>\`
- \`moveRepo(repoId: string, toGroupId: string, index: number): Promise<void>\`
- \`reorderRepo(groupId: string, fromIndex: number, toIndex: number): Promise<void>\`

#### git methods

- \`status(repoId: string): Promise<RepoStatus>\`
  - returns cached immediately if available and triggers refresh in background
- \`refreshStatus(repoId: string): Promise<RepoStatus>\`
  - forces refresh
- \`fetch(repoId: string, remote?: string): Promise<OpResult>\`
- \`push(repoId: string, branch: string): Promise<OpResult>\`
- \`publish(repoId: string, branch: string): Promise<OpResult>\`
- \`branches(repoId: string): Promise<BranchesResult>\`
- \`createBranch(repoId: string, name: string, from: string): Promise<OpResult>\`
- \`trackBranch(repoId: string, remoteBranch: string, localName?: string): Promise<OpResult>\`
- \`switchBranch(repoId: string, name: string): Promise<OpResult>\` (recommended)
- \`diff(repoId: string, filePath: string, staged: boolean): Promise<DiffResult>\`
- \`rebaseStart(repoId: string, onto: string): Promise<OpResult>\`
- \`rebaseContinue(repoId: string): Promise<OpResult>\`
- \`rebaseAbort(repoId: string): Promise<OpResult>\`
- \`stageFile(repoId: string, filePath: string): Promise<OpResult>\`

#### events

- \`on(eventName: string, handler: (payload: any) => void): () => void\`
  - returns unsubscribe function

Events to implement:

- \`repoStatusUpdated\` \u2192 \`{ repoId, status }\`
- \`operationProgress\` \u2192 \`{ repoId, opId, line }\`
- \`operationError\` \u2192 \`{ repoId, opId, message, details }\`
- \`rebaseStateChanged\` \u2192 \`{ repoId, state }\`

---

## 14. Data Types

### RepoStatus

Must include:

- \`repoId: string\`
- \`path: string\`
- \`branch: string | null\`
- \`upstream: string | null\`
- \`ahead: number\`
- \`behind: number\`
- \`isDirty: boolean\`
- \`rebase: { inProgress: boolean, conflicts: string[] }\`
- \`changes: { staged: FileChange[], unstaged: FileChange[], untracked: FileChange[] }\`
- \`lastUpdatedAt: number\` (epoch ms)

### FileChange

- \`path: string\`
- \`status: string\` (porcelain status code)
- \`kind: "staged" | "unstaged" | "untracked" | "conflict"\`

### DiffResult

- \`filePath: string\`
- \`staged: boolean\`
- \`diffText: string\`

### BranchesResult

- \`local: BranchInfo[]\`
- \`remote: BranchInfo[]\`

### BranchInfo

- \`name: string\`
- \`isCurrent: boolean\`
- \`upstream: string | null\`
- \`ahead: number | null\`
- \`behind: number | null\`

### OpResult

- \`opId: string\`
- \`success: boolean\`
- \`stdout?: string\`
- \`stderr?: string\`

---

## 15. Watchers + Refresh Policy

### Watch targets (per repo)

- \`.git/HEAD\`
- \`.git/index\`
- \`.git/refs/\*\*\` (light touch)
- optionally: working tree directories (configurable)

### Debounce

- Debounce refresh triggers (e.g., 250\u2013500ms)
- Ensure refresh queue doesn’t grow unbounded
- Coalesce repeated refresh requests into one

---

## 16. External Editor Integration (Cursor)

The app should facilitate opening files in Cursor:

- Provide a UI action: “Open in Cursor”
- Implementation can be:
  - Use \`open -a Cursor <filePath>\` (macOS)
  - Or configurable editor command in settings later

Minimum behavior:

- During conflicts, user can open each conflicted file quickly.
- After resolving in Cursor, user returns and clicks checkmark (stage file).

---

## 17. Error Handling & User Messaging

- Always show a friendly error message in UI.
- Provide a “Details” toggle to show stderr/stdout.
- Common errors to handle:
  - missing upstream branch
  - authentication failures during push/fetch
  - rebase conflicts
  - repo not found / moved path
  - git not installed

---

## 18. Packaging & Distribution

Use \`electron-builder\` (recommended).

Build artifacts:

- \`.dmg\` (primary)
- \`.zip\` (secondary)

App name: **githulu**

No auto-update required.

---

## 19. Repo Structure (Monorepo)

Suggested layout:

- \`/apps/githulu-electron/\`
  - \`/src/main/\` (Electron main process)
  - \`/src/preload/\` (contextBridge API)
  - \`/src/shared/\` (types shared with renderer)
  - \`electron-builder.yml\` (or package.json config)
- \`/apps/githulu-ui/\`
  - Nuxt 3 app
  - Pinia stores
  - UI components

Alternative: single app folder with Nuxt built into Electron, but split apps keeps clean boundaries.

---

## 20. Implementation Phases

### Phase 1 (MVP)

- Repo registry (add/remove, groups, drag/drop)
- Status parsing (porcelain v2)
- Diff pane for selected file
- Fetch + ahead/behind
- Push + publish
- Branch list + create + track + switch (recommended)
- Rebase start/continue/abort with conflict list and stage-by-checkmark

### Phase 2 (Quality + Tower-like polish)

- Commit history list
- File tree improvements
- Better diff rendering (syntax highlight, intra-line)
- Settings (editor command, watcher scope, refresh intervals)
- Cached diffs for fast switching

### Phase 3 (Nice-to-haves)

- Stash UI
- Tags
- Basic blame view
- Simple graph visualization

---

## 21. Acceptance Criteria (MVP)

- A teammate can clone the repo, run \`pnpm install\`, then \`pnpm dev\`, and see the app window.
- User can add repos, create groups, drag/drop reorder.
- Selecting a repo shows status quickly and updates within 1s after a change.
- Fetch updates remote branches and refreshes ahead/behind.
- Push and publish work for current branch.
- Rebase flow:
  - Start rebase onto \`origin/main\` (or chosen base)
  - If conflicts occur, UI lists conflict files
  - User stages resolved files via checkmark
  - Continue completes rebase (or shows next conflicts)
  - Abort restores previous state
- Clicking changed files shows correct diff in right pane.

---

## 22. Developer Notes / Implementation Tips

- Prefer \`status --porcelain=v2\` parsing for robust output.
- Keep an internal \`RepoStateCache\` in main process keyed by repoId.
- Renderer should treat main process as authoritative; it only renders state and sends intent.
- Make all operations idempotent when possible (e.g., refresh can be called repeatedly).
- Always normalize file paths and ensure file operations remain within repo root.

---

## 23. Open Questions (Optional for later)

- Do we want to support multiple remotes beyond origin in UI? - Just origin for now
- Should we support pulling with rebase as a one-click action (fetch + rebase onto upstream)? - that would be cool
- Do we want to store any history cache (log) or compute on demand only? - i think some sort of history cache would make sense for speed...we just need to make sure we are updating it appropriately.

## 24. Important

- This is an important note - but the main reason I am building this is for my team to unconditionally utilize rebasing branches when pulling in updates or rebasing their branches off of origin/main. In the past, using 'merge' instead of 'rebase' has caused messy git history that I would like to universally avoid. So whatever we can do to make the rebasing process simply stupid easy...the better.

---
