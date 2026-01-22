// Types for window.githulu API exposed by Electron preload script

export interface Group {
  id: string;
  name: string;
  repoIds: string[];
}

export interface Repo {
  id: string;
  path: string;
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
  lastUpdatedAt: number;
}

export interface RebaseState {
  inProgress: boolean;
  step?: number;
  total?: number;
  conflicts: string[];
}

export interface FileChange {
  path: string;
  status: string;
  kind: 'staged' | 'unstaged' | 'untracked' | 'conflict';
  oldPath?: string;
}

export interface DiffResult {
  filePath: string;
  staged: boolean;
  diffText: string;
}

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
}

export interface LogResult {
  commits: CommitInfo[];
  hasMore: boolean;
}

export interface CommitFileChange {
  path: string;
  status: string; // A (added), D (deleted), M (modified), R (renamed)
  oldPath?: string;
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

export interface StashInfo {
  index: number;
  message: string;
  branch: string;
  hash: string;
  date: string;
  relativeDate: string;
}

export interface StashListResult {
  stashes: StashInfo[];
}

export interface OpResult {
  opId: string;
  success: boolean;
  stdout?: string;
  stderr?: string;
}

// API interfaces
export interface GithuluReposAPI {
  list(): Promise<{ groups: Group[]; repos: Repo[]; ui: UIState }>;
  add(path: string): Promise<{ repo: Repo }>;
  remove(repoId: string): Promise<void>;
  createGroup(name: string): Promise<{ group: Group }>;
  renameGroup(groupId: string, name: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  moveRepo(repoId: string, toGroupId: string, index: number): Promise<void>;
  reorderRepo(groupId: string, fromIndex: number, toIndex: number): Promise<void>;
}

export interface PushOptions {
  force?: boolean;
  forceWithLease?: boolean;
  remote?: string;
}

export interface PullOptions {
  remote?: string;
  rebase?: boolean;
}

export interface GithuluGitAPI {
  status(repoId: string): Promise<RepoStatus>;
  refreshStatus(repoId: string): Promise<RepoStatus>;
  fetch(repoId: string, remote?: string): Promise<OpResult>;
  push(repoId: string, branch: string): Promise<OpResult>;
  pushWithOptions(repoId: string, branch: string, options?: PushOptions): Promise<OpResult>;
  pull(repoId: string, options?: PullOptions): Promise<OpResult>;
  publish(repoId: string, branch: string): Promise<OpResult>;
  branches(repoId: string): Promise<BranchesResult>;
  log(repoId: string, count?: number, skip?: number): Promise<LogResult>;
  showCommit(repoId: string, hash: string): Promise<CommitDetailResult>;
  diffCommitFile(repoId: string, hash: string, filePath: string): Promise<DiffResult>;
  createBranch(repoId: string, name: string, from: string): Promise<OpResult>;
  trackBranch(repoId: string, remoteBranch: string, localName?: string): Promise<OpResult>;
  switchBranch(repoId: string, name: string): Promise<OpResult>;
  diff(repoId: string, filePath: string, staged: boolean): Promise<DiffResult>;
  stageFile(repoId: string, filePath: string): Promise<OpResult>;
  unstageFile(repoId: string, filePath: string): Promise<OpResult>;
  stageAll(repoId: string): Promise<OpResult>;
  commit(repoId: string, message: string): Promise<OpResult>;
  rebaseStart(repoId: string, onto: string): Promise<OpResult>;
  rebaseContinue(repoId: string): Promise<OpResult>;
  rebaseAbort(repoId: string): Promise<OpResult>;
  stashList(repoId: string): Promise<StashListResult>;
  stashPush(repoId: string, message?: string, includeUntracked?: boolean): Promise<OpResult>;
  stashPop(repoId: string, index?: number): Promise<OpResult>;
  stashApply(repoId: string, index: number): Promise<OpResult>;
  stashDrop(repoId: string, index: number): Promise<OpResult>;
}

export interface GithuluEventsAPI {
  on(eventName: string, handler: (payload: unknown) => void): () => void;
}

export interface GithuluUtilsAPI {
  selectFolder(): Promise<string | null>;
  openInEditor(filePath: string): Promise<void>;
}

export interface GithuluUIAPI {
  savePreferences(prefs: UIPreferences): Promise<void>;
  loadPreferences(): Promise<UIPreferences | null>;
}

export interface GithuluAPI {
  repos: GithuluReposAPI;
  git: GithuluGitAPI;
  events: GithuluEventsAPI;
  utils: GithuluUtilsAPI;
  ui: GithuluUIAPI;
}

declare global {
  interface Window {
    githulu: GithuluAPI;
  }
}

export {};
