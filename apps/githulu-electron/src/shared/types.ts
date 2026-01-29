// ============================================
// Storage Types
// ============================================

export interface StorageSchema {
  version: number;
  groups: Group[];
  repos: Repo[];
  ui: UIState;
}

export interface Group {
  id: string; // "grp_" prefix + nanoid
  name: string;
  repoIds: string[];
}

export interface Repo {
  id: string; // "repo_" prefix + nanoid
  path: string; // Absolute path to repo root
  displayName: string;
}

export interface UIState {
  selectedRepoId: string | null;
  selectedView: 'workingCopy' | 'branches';
  sidebarWidth: number;
  rightPaneWidth: number;
}

export interface UIPreferences {
  sidebarWidth?: number;
  rightPaneWidth?: number;
}

// ============================================
// Git Status Types
// ============================================

export interface RepoStatus {
  repoId: string;
  path: string;
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  isDirty: boolean;
  rebase: RebaseState;
  changes: {
    staged: FileChange[];
    unstaged: FileChange[];
    untracked: FileChange[];
  };
  lastUpdatedAt: number; // epoch ms
}

export interface RebaseState {
  inProgress: boolean;
  step?: number;
  total?: number;
  conflicts: string[];
}

export interface FileChange {
  path: string;
  status: string; // porcelain status code
  kind: 'staged' | 'unstaged' | 'untracked' | 'conflict';
  oldPath?: string; // for renames
}

// ============================================
// Diff Types
// ============================================

export interface DiffResult {
  filePath: string;
  staged: boolean;
  diffText: string;
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// ============================================
// Branch Types
// ============================================

export interface BranchesResult {
  local: BranchInfo[];
  remote: BranchInfo[];
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  upstream: string | null;
  ahead: number | null;
  behind: number | null;
  lastCommit?: string;
}

// ============================================
// Commit Log Types
// ============================================

export interface CommitInfo {
  hash: string;
  shortHash: string;
  subject: string;
  body: string;
  author: string;
  authorEmail: string;
  date: string;
  relativeDate: string;
  refs: string[];
  isUpstream?: boolean; // true if commit exists only on upstream (not yet pulled)
}

export interface LogResult {
  commits: CommitInfo[];
  hasMore: boolean;
}

export interface CommitFileChange {
  path: string;
  status: string; // A (added), D (deleted), M (modified), R (renamed)
  oldPath?: string; // For renames
}

export interface CommitDetailResult {
  hash: string;
  shortHash: string;
  subject: string;
  body: string;
  author: string;
  authorEmail: string;
  date: string;
  relativeDate: string;
  refs: string[];
  files: CommitFileChange[];
}

// ============================================
// Stash Types
// ============================================

export interface StashInfo {
  index: number;           // stash@{0}, stash@{1}, etc.
  message: string;         // User message or auto-generated
  branch: string;          // Branch where stash was created
  hash: string;            // SHA of the stash commit
  date: string;            // ISO date string
  relativeDate: string;    // "2 hours ago", etc.
}

export interface StashListResult {
  stashes: StashInfo[];
}

// ============================================
// Operation Types
// ============================================

export interface OpResult {
  opId: string;
  success: boolean;
  stdout?: string;
  stderr?: string;
}

export interface GitResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ============================================
// Event Types
// ============================================

export interface RepoStatusUpdatedEvent {
  repoId: string;
  status: RepoStatus;
}

export interface OperationProgressEvent {
  repoId: string;
  opId: string;
  line: string;
}

export interface OperationErrorEvent {
  repoId: string;
  opId: string;
  message: string;
  details?: string;
}

export interface RebaseStateChangedEvent {
  repoId: string;
  state: RebaseState;
}

// ============================================
// IPC Channel Types
// ============================================

export type IPCChannels = {
  // Repos
  'githulu:repos:list': () => Promise<{ groups: Group[]; repos: Repo[]; ui: UIState }>;
  'githulu:repos:add': (path: string) => Promise<{ repo: Repo }>;
  'githulu:repos:remove': (repoId: string) => Promise<void>;
  'githulu:repos:createGroup': (name: string) => Promise<{ group: Group }>;
  'githulu:repos:renameGroup': (groupId: string, name: string) => Promise<void>;
  'githulu:repos:deleteGroup': (groupId: string) => Promise<void>;
  'githulu:repos:moveRepo': (repoId: string, toGroupId: string, index: number) => Promise<void>;
  'githulu:repos:reorderRepo': (groupId: string, fromIndex: number, toIndex: number) => Promise<void>;

  // Git
  'githulu:git:status': (repoId: string) => Promise<RepoStatus>;
  'githulu:git:refreshStatus': (repoId: string) => Promise<RepoStatus>;
  'githulu:git:fetch': (repoId: string, remote?: string) => Promise<OpResult>;
  'githulu:git:push': (repoId: string, branch: string) => Promise<OpResult>;
  'githulu:git:publish': (repoId: string, branch: string) => Promise<OpResult>;
  'githulu:git:branches': (repoId: string) => Promise<BranchesResult>;
  'githulu:git:log': (repoId: string, count?: number, skip?: number) => Promise<LogResult>;
  'githulu:git:showCommit': (repoId: string, hash: string) => Promise<CommitDetailResult>;
  'githulu:git:diffCommitFile': (repoId: string, hash: string, filePath: string) => Promise<DiffResult>;
  'githulu:git:createBranch': (repoId: string, name: string, from: string) => Promise<OpResult>;
  'githulu:git:trackBranch': (repoId: string, remoteBranch: string, localName?: string) => Promise<OpResult>;
  'githulu:git:switchBranch': (repoId: string, name: string) => Promise<OpResult>;
  'githulu:git:diff': (repoId: string, filePath: string, staged: boolean) => Promise<DiffResult>;
  'githulu:git:stageFile': (repoId: string, filePath: string) => Promise<OpResult>;
  'githulu:git:unstageFile': (repoId: string, filePath: string) => Promise<OpResult>;
  'githulu:git:stageAll': (repoId: string) => Promise<OpResult>;
  'githulu:git:commit': (repoId: string, message: string) => Promise<OpResult>;
  'githulu:git:rebaseStart': (repoId: string, onto: string) => Promise<OpResult>;
  'githulu:git:rebaseContinue': (repoId: string) => Promise<OpResult>;
  'githulu:git:rebaseAbort': (repoId: string) => Promise<OpResult>;
  'githulu:git:stashList': (repoId: string) => Promise<StashListResult>;
  'githulu:git:stashPush': (repoId: string, message?: string, includeUntracked?: boolean) => Promise<OpResult>;
  'githulu:git:stashPop': (repoId: string, index?: number) => Promise<OpResult>;
  'githulu:git:stashApply': (repoId: string, index: number) => Promise<OpResult>;
  'githulu:git:stashDrop': (repoId: string, index: number) => Promise<OpResult>;

  // Utils
  'githulu:utils:selectFolder': () => Promise<string | null>;
  'githulu:utils:openInEditor': (filePath: string) => Promise<void>;

  // UI Preferences
  'githulu:ui:savePreferences': (prefs: UIPreferences) => Promise<void>;
  'githulu:ui:loadPreferences': () => Promise<UIPreferences | null>;
};

// Event channel types
export type EventChannels =
  | 'githulu:event:repoStatusUpdated'
  | 'githulu:event:operationProgress'
  | 'githulu:event:operationError'
  | 'githulu:event:rebaseStateChanged';
