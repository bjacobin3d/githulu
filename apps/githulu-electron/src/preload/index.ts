import { contextBridge, ipcRenderer } from 'electron';

// Type-safe event listener management
type EventHandler = (payload: unknown) => void;

const api = {
  repos: {
    list: () => ipcRenderer.invoke('githulu:repos:list'),
    add: (path: string) => ipcRenderer.invoke('githulu:repos:add', path),
    remove: (repoId: string) => ipcRenderer.invoke('githulu:repos:remove', repoId),
    createGroup: (name: string) => ipcRenderer.invoke('githulu:repos:createGroup', name),
    renameGroup: (groupId: string, name: string) =>
      ipcRenderer.invoke('githulu:repos:renameGroup', groupId, name),
    deleteGroup: (groupId: string) => ipcRenderer.invoke('githulu:repos:deleteGroup', groupId),
    moveRepo: (repoId: string, toGroupId: string, index: number) =>
      ipcRenderer.invoke('githulu:repos:moveRepo', repoId, toGroupId, index),
    reorderRepo: (groupId: string, fromIndex: number, toIndex: number) =>
      ipcRenderer.invoke('githulu:repos:reorderRepo', groupId, fromIndex, toIndex),
  },

  git: {
    status: (repoId: string) => ipcRenderer.invoke('githulu:git:status', repoId),
    refreshStatus: (repoId: string) => ipcRenderer.invoke('githulu:git:refreshStatus', repoId),
    fetch: (repoId: string, remote?: string) =>
      ipcRenderer.invoke('githulu:git:fetch', repoId, remote),
    push: (repoId: string, branch: string) =>
      ipcRenderer.invoke('githulu:git:push', repoId, branch),
    pushWithOptions: (
      repoId: string,
      branch: string,
      options?: { force?: boolean; forceWithLease?: boolean; remote?: string }
    ) => ipcRenderer.invoke('githulu:git:pushWithOptions', repoId, branch, options),
    pull: (repoId: string, options?: { remote?: string; rebase?: boolean }) =>
      ipcRenderer.invoke('githulu:git:pull', repoId, options),
    publish: (repoId: string, branch: string) =>
      ipcRenderer.invoke('githulu:git:publish', repoId, branch),
    branches: (repoId: string) => ipcRenderer.invoke('githulu:git:branches', repoId),
    log: (repoId: string, count?: number, skip?: number) =>
      ipcRenderer.invoke('githulu:git:log', repoId, count, skip),
    showCommit: (repoId: string, hash: string) =>
      ipcRenderer.invoke('githulu:git:showCommit', repoId, hash),
    diffCommitFile: (repoId: string, hash: string, filePath: string) =>
      ipcRenderer.invoke('githulu:git:diffCommitFile', repoId, hash, filePath),
    createBranch: (repoId: string, name: string, from: string) =>
      ipcRenderer.invoke('githulu:git:createBranch', repoId, name, from),
    trackBranch: (repoId: string, remoteBranch: string, localName?: string) =>
      ipcRenderer.invoke('githulu:git:trackBranch', repoId, remoteBranch, localName),
    switchBranch: (repoId: string, name: string) =>
      ipcRenderer.invoke('githulu:git:switchBranch', repoId, name),
    diff: (repoId: string, filePath: string, staged: boolean) =>
      ipcRenderer.invoke('githulu:git:diff', repoId, filePath, staged),
    stageFile: (repoId: string, filePath: string) =>
      ipcRenderer.invoke('githulu:git:stageFile', repoId, filePath),
    unstageFile: (repoId: string, filePath: string) =>
      ipcRenderer.invoke('githulu:git:unstageFile', repoId, filePath),
    stageAll: (repoId: string) => ipcRenderer.invoke('githulu:git:stageAll', repoId),
    commit: (repoId: string, message: string) =>
      ipcRenderer.invoke('githulu:git:commit', repoId, message),
    rebaseStart: (repoId: string, onto: string) =>
      ipcRenderer.invoke('githulu:git:rebaseStart', repoId, onto),
    rebaseContinue: (repoId: string) => ipcRenderer.invoke('githulu:git:rebaseContinue', repoId),
    rebaseAbort: (repoId: string) => ipcRenderer.invoke('githulu:git:rebaseAbort', repoId),
    stashList: (repoId: string) => ipcRenderer.invoke('githulu:git:stashList', repoId),
    stashPush: (repoId: string, message?: string, includeUntracked?: boolean) =>
      ipcRenderer.invoke('githulu:git:stashPush', repoId, message, includeUntracked),
    stashPop: (repoId: string, index?: number) =>
      ipcRenderer.invoke('githulu:git:stashPop', repoId, index),
    stashApply: (repoId: string, index: number) =>
      ipcRenderer.invoke('githulu:git:stashApply', repoId, index),
    stashDrop: (repoId: string, index: number) =>
      ipcRenderer.invoke('githulu:git:stashDrop', repoId, index),
  },

  events: {
    on: (eventName: string, handler: EventHandler): (() => void) => {
      const channel = `githulu:event:${eventName}`;
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
        handler(payload);
      };

      ipcRenderer.on(channel, listener);

      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
  },

  utils: {
    selectFolder: () => ipcRenderer.invoke('githulu:utils:selectFolder'),
    openInEditor: (filePath: string) => ipcRenderer.invoke('githulu:utils:openInEditor', filePath),
  },

  ui: {
    savePreferences: (prefs: { sidebarWidth?: number; rightPaneWidth?: number }) =>
      ipcRenderer.invoke('githulu:ui:savePreferences', prefs),
    loadPreferences: () => ipcRenderer.invoke('githulu:ui:loadPreferences'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('githulu', api);

// TypeScript: Export the type for the renderer
export type GithuluAPI = typeof api;
