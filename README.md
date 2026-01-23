# githulu

A local-first Git desktop client for macOS that emphasizes **rebase-first workflows**. Built with Electron + Nuxt 3.

## Features

### Repository Management
- **Bookmarks View**: Repository browser with groups and drag-and-drop organization
- **Real-time Status**: See ahead/behind counts, uncommitted changes, and current branch at a glance

### Branch Operations
- **Branch Sidebar**: View local and remote branches in a dedicated sidebar
- **Context Menus**: Right-click branches for quick actions (pull, push, force push, publish, track, rebase)
- **Create Branches**: Create new branches from any ref with auto-filled "based on" field
- **Switch Branches**: Double-click to switch, single-click to view history

### Working Copy
- **Unified File List**: All staged, unstaged, and untracked files in one view
- **Checkbox Staging**: Click checkboxes to stage/unstage files (checked = staged, dash = partially staged, empty = unstaged)
- **Diff Viewer**: View file changes with syntax highlighting

### Git Operations
- **Pull/Fetch**: Pull from remotes with real-time progress
- **Push**: Standard push and force push with lease
- **Publish**: Publish local branches to remotes
- **Rebase**: Interactive rebase with conflict resolution UI
- **Stash Management**: Create, list, apply, pop, and drop stashes

### Commit History
- **Branch History**: View commit log for any branch
- **Commit Details**: Click a commit to see all changed files
- **Expandable Diffs**: Expand any file in a commit to view its diff

### UI/UX
- **Resizable Sidebars**: Drag to resize left and right panes (preferences saved)
- **Progress Drawer**: Real-time feedback for Git operations with auto-dismiss
- **Keyboard Shortcuts**: Quick access to common operations
- **Dark Theme**: Deep purple primary with vibrant accents

## Tech Stack

- **Desktop**: Electron 28
- **UI**: Nuxt 3 (Vue 3) + Pinia
- **Styling**: Tailwind CSS with custom theme
- **Git**: System Git via child_process with operation queue
- **Drag and Drop**: VueDraggable
- **Icons**: Lucide Icons

## Development

### Prerequisites

- Node.js 22+
- pnpm 10+
- Git

### Setup

```bash
# Install dependencies
pnpm install
```

### Development (Two Terminals)

The UI and Electron need to run in **separate terminals**:

**Terminal 1 — Start the Nuxt UI dev server:**
```bash
pnpm dev:ui
```

**Terminal 2 — Once the UI is running, start Electron:**
```bash
pnpm dev:electron
```

> **Note:** The combined `pnpm dev` command exists but may cause TTY errors on some systems. Use the two-terminal approach for reliable development.

### Build Commands

```bash
# Build for production
pnpm build

# Package as .dmg and .zip for macOS
pnpm package
```

## Project Structure

```
githulu/
├── apps/
│   ├── githulu-electron/        # Electron main process
│   │   ├── src/main/
│   │   │   ├── cache/           # Repository state caching
│   │   │   ├── git/             # Git command runner, parser, queue
│   │   │   ├── ipc/             # IPC handlers (git, repos, ui)
│   │   │   ├── storage/         # JSON file storage with migrations
│   │   │   └── watchers/        # File system watchers for .git
│   │   ├── src/preload/         # contextBridge API
│   │   └── src/shared/          # Shared types
│   │
│   └── githulu-ui/              # Nuxt 3 frontend
│       ├── components/
│       │   ├── center/          # WorkingCopy, HistoryList, StashView, etc.
│       │   ├── diff/            # Viewer, CommitDetails, Blame
│       │   ├── shared/          # Modals, menus, dialogs
│       │   └── sidebar/         # WorkspaceSidebar, RepoList
│       ├── composables/         # useGithulu, useKeyboard
│       ├── stores/              # Pinia stores (git, repos, ui)
│       ├── pages/               # App pages
│       └── types/               # TypeScript definitions
│
├── docs/
│   └── spec.md                  # Full specification
│
└── package.json                 # Workspace root
```

## Architecture

githulu uses a secure IPC bridge between the Electron main process and the Nuxt renderer:

- **Main Process**: Handles all Git operations, file system access, and storage
- **Git Queue**: Serializes Git operations per-repository to prevent lock conflicts
- **Preload Script**: Exposes a type-safe `window.githulu` API via contextBridge
- **Renderer**: Nuxt 3 app that uses the API for all operations

### Security

- `contextIsolation: true` - Renderer is isolated from Node.js
- `nodeIntegration: false` - No direct Node.js access in renderer
- `sandbox: true` - Renderer runs in a sandbox
- All Git operations validated in main process

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+R` | Refresh status |
| `Cmd+Shift+F` | Fetch from remote |
| `Cmd+Shift+P` | Push to remote |
| `Cmd+N` | Create new branch |
| `Escape` | Clear selection / Go back |

## Rebase Workflow

githulu is designed to make rebasing simple and safe:

1. Right-click a branch and select "Rebase On Revision"
2. Select the target branch (e.g., `origin/main`)
3. If conflicts occur, they are shown in a dedicated panel
4. Click "Open in Cursor" to edit each conflicted file
5. After resolving, stage the file with the checkbox
6. Once all conflicts are resolved, click "Continue Rebase"

The goal is to keep your Git history clean and linear.

## Stash Workflow

Quick stash workflow for saving work in progress:

1. Click the "Stash" button in the repo header (when you have uncommitted changes)
2. Enter an optional message and choose whether to include untracked files
3. View stashes by clicking "Stashes" in the sidebar
4. Apply, pop, or drop stashes as needed

## License

MIT

## Credits

Built with:
- [Electron](https://www.electronjs.org/)
- [Nuxt](https://nuxt.com/)
- [Vue.js](https://vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [VueDraggable](https://github.com/SortableJS/vue.draggable.next)
