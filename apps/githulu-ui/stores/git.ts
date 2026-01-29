import { defineStore } from 'pinia';
import type { RepoStatus, BranchesResult, OpResult, FileChange, StashListResult } from '~/types/githulu';

interface OperationProgress {
  repoId: string;
  type: string;
  opId: string;
  lines: string[];
  completed?: boolean;
  success?: boolean;
}

interface OperationError {
  repoId: string;
  opId: string;
  message: string;
  details?: string;
  timestamp: number;
}

interface GitState {
  statusCache: Map<string, RepoStatus>;
  branchesCache: Map<string, BranchesResult>;
  stashCache: Map<string, StashListResult>;
  currentOperation: OperationProgress | null;
  errors: OperationError[];
  loading: Map<string, boolean>;
}

export const useGitStore = defineStore('git', {
  state: (): GitState => ({
    statusCache: new Map(),
    branchesCache: new Map(),
    stashCache: new Map(),
    currentOperation: null,
    errors: [],
    loading: new Map(),
  }),

  getters: {
    getStatus(state) {
      return (repoId: string): RepoStatus | null => {
        return state.statusCache.get(repoId) || null;
      };
    },

    getBranches(state) {
      return (repoId: string): BranchesResult | null => {
        return state.branchesCache.get(repoId) || null;
      };
    },

    getStashes(state) {
      return (repoId: string): StashListResult | null => {
        return state.stashCache.get(repoId) || null;
      };
    },

    isLoading(state) {
      return (repoId: string): boolean => {
        return state.loading.get(repoId) || false;
      };
    },

    latestErrors(state): OperationError[] {
      // Return last 5 errors, most recent first
      return [...state.errors].reverse().slice(0, 5);
    },

    hasRebaseInProgress(state) {
      return (repoId: string): boolean => {
        const status = state.statusCache.get(repoId);
        return status?.rebase.inProgress ?? false;
      };
    },

    getConflicts(state) {
      return (repoId: string): string[] => {
        const status = state.statusCache.get(repoId);
        return status?.rebase.conflicts ?? [];
      };
    },
  },

  actions: {
    async fetchStatus(repoId: string) {
      if (!window.githulu) return;

      this.loading.set(repoId, true);

      try {
        const status = await window.githulu.git.status(repoId);
        this.statusCache.set(repoId, status);
      } catch (err) {
        this.addError(repoId, 'status', 'Failed to fetch status', err);
      } finally {
        this.loading.set(repoId, false);
      }
    },

    async refreshStatus(repoId: string) {
      if (!window.githulu) return;

      this.loading.set(repoId, true);

      try {
        const status = await window.githulu.git.refreshStatus(repoId);
        this.statusCache.set(repoId, status);
      } catch (err) {
        this.addError(repoId, 'refresh', 'Failed to refresh status', err);
      } finally {
        this.loading.set(repoId, false);
      }
    },

    async fetchBranches(repoId: string) {
      if (!window.githulu) return null;

      try {
        const branches = await window.githulu.git.branches(repoId);
        this.branchesCache.set(repoId, branches);
        return branches;
      } catch (err) {
        this.addError(repoId, 'branches', 'Failed to fetch branches', err);
        return null;
      }
    },

    // Fetch from remote - should work regardless of working directory state
    // (pending changes, rebase, etc.) since fetch only updates remote refs
    async fetch(repoId: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'fetch');

      try {
        const result = await window.githulu.git.fetch(repoId);
        this.endOperation();
        return result;
      } catch (err) {
        this.addError(repoId, 'fetch', 'Failed to fetch from remote', err);
        this.endOperation(false);
        return null;
      }
    },

    async push(repoId: string, branch: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'push');

      try {
        const result = await window.githulu.git.push(repoId, branch);
        this.endOperation();
        return result;
      } catch (err) {
        this.addError(repoId, 'push', 'Failed to push to remote', err);
        this.endOperation(false);
        return null;
      }
    },

    async pushWithOptions(
      repoId: string,
      branch: string,
      options?: { force?: boolean; forceWithLease?: boolean; remote?: string }
    ): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, options?.force || options?.forceWithLease ? 'force-push' : 'push');

      try {
        const result = await window.githulu.git.pushWithOptions(repoId, branch, options);
        this.endOperation();
        return result;
      } catch (err) {
        this.addError(repoId, 'push', 'Failed to push to remote', err);
        this.endOperation(false);
        return null;
      }
    },

    async pull(
      repoId: string,
      options?: { remote?: string; rebase?: boolean }
    ): Promise<OpResult | null> {
      if (!window.githulu) return null;

      // Note: Pull with rebase requires a clean working directory
      // Validation should happen in UI before calling this
      this.startOperation(repoId, 'pull');

      try {
        const result = await window.githulu.git.pull(repoId, options);
        this.endOperation();
        return result;
      } catch (err) {
        this.addError(repoId, 'pull', 'Failed to pull from remote', err);
        this.endOperation(false);
        return null;
      }
    },

    async publish(repoId: string, branch: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'publish');

      try {
        const result = await window.githulu.git.publish(repoId, branch);
        this.endOperation();
        return result;
      } catch (err) {
        this.addError(repoId, 'publish', 'Failed to publish branch', err);
        this.endOperation(false);
        return null;
      }
    },

    async createBranch(repoId: string, name: string, from: string): Promise<OpResult | null> {
      if (!window.githulu) {
        console.error('[githulu] createBranch: API not available');
        return null;
      }

      try {
        console.log('[githulu] Creating branch:', { repoId, name, from });
        const result = await window.githulu.git.createBranch(repoId, name, from);
        console.log('[githulu] Branch creation result:', result);
        
        if (result.success) {
          // Don't let fetchBranches failure block success - fire and forget
          this.fetchBranches(repoId).catch(err => {
            console.warn('[githulu] Failed to fetch branches after create:', err);
          });
        }
        
        return result;
      } catch (err) {
        console.error('[githulu] Branch creation error:', err);
        this.addError(repoId, 'createBranch', 'Failed to create branch', err);
        return null;
      }
    },

    async switchBranch(repoId: string, name: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      try {
        const result = await window.githulu.git.switchBranch(repoId, name);
        return result;
      } catch (err) {
        this.addError(repoId, 'switchBranch', 'Failed to switch branch', err);
        return null;
      }
    },

    async trackBranch(
      repoId: string,
      remoteBranch: string,
      localName?: string
    ): Promise<OpResult | null> {
      if (!window.githulu) return null;

      try {
        const result = await window.githulu.git.trackBranch(repoId, remoteBranch, localName);
        if (result.success) {
          await this.fetchBranches(repoId);
        }
        return result;
      } catch (err) {
        this.addError(repoId, 'trackBranch', 'Failed to track branch', err);
        return null;
      }
    },

    async stageFile(repoId: string, filePath: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      try {
        const result = await window.githulu.git.stageFile(repoId, filePath);
        if (result?.success) {
          // Refresh status to update UI
          await this.fetchStatus(repoId);
        }
        return result;
      } catch (err) {
        this.addError(repoId, 'stage', 'Failed to stage file', err);
        return null;
      }
    },

    async unstageFile(repoId: string, filePath: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      try {
        const result = await window.githulu.git.unstageFile(repoId, filePath);
        if (result?.success) {
          // Refresh status to update UI
          await this.fetchStatus(repoId);
        }
        return result;
      } catch (err) {
        this.addError(repoId, 'unstage', 'Failed to unstage file', err);
        return null;
      }
    },

    async rebaseStart(repoId: string, onto: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'rebase');

      try {
        const result = await window.githulu.git.rebaseStart(repoId, onto);
        this.endOperation();
        return result;
      } catch (err) {
        this.addError(repoId, 'rebase', 'Failed to start rebase', err);
        this.endOperation(false);
        return null;
      }
    },

    async rebaseContinue(repoId: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'rebase-continue');

      try {
        const result = await window.githulu.git.rebaseContinue(repoId);
        this.endOperation();
        return result;
      } catch (err) {
        this.addError(repoId, 'rebase', 'Failed to continue rebase', err);
        this.endOperation(false);
        return null;
      }
    },

    async rebaseAbort(repoId: string): Promise<OpResult | null> {
      if (!window.githulu) return null;

      try {
        const result = await window.githulu.git.rebaseAbort(repoId);
        return result;
      } catch (err) {
        this.addError(repoId, 'rebase', 'Failed to abort rebase', err);
        return null;
      }
    },

    // Update status from event
    updateStatus(repoId: string, status: RepoStatus) {
      this.statusCache.set(repoId, status);
    },

    // Operation progress tracking
    startOperation(repoId: string, type: string) {
      this.currentOperation = {
        repoId,
        type,
        opId: `op_${Date.now()}`,
        lines: [],
      };
    },

    addProgressLine(line: string) {
      if (this.currentOperation) {
        this.currentOperation.lines.push(line);
      }
    },

    endOperation(success: boolean = true) {
      if (this.currentOperation) {
        this.currentOperation.completed = true;
        this.currentOperation.success = success;
        
        // Auto-dismiss after a short delay
        setTimeout(() => {
          this.currentOperation = null;
        }, 1500);
      }
    },

    clearOperation() {
      this.currentOperation = null;
    },

    // Error management
    addError(repoId: string, opId: string, message: string, err: unknown) {
      this.errors.push({
        repoId,
        opId,
        message,
        details: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      });

      // Keep only last 20 errors
      if (this.errors.length > 20) {
        this.errors = this.errors.slice(-20);
      }
    },

    clearErrors() {
      this.errors = [];
    },

    dismissError(timestamp: number) {
      this.errors = this.errors.filter((e) => e.timestamp !== timestamp);
    },

    // Stash operations
    async fetchStashes(repoId: string): Promise<void> {
      if (!window.githulu) return;

      try {
        const result = await window.githulu.git.stashList(repoId);
        this.stashCache.set(repoId, result);
      } catch (err) {
        this.addError(repoId, 'fetchStashes', 'Failed to fetch stashes', err);
      }
    },

    async createStash(repoId: string, message?: string, includeUntracked?: boolean): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'stash');

      try {
        const result = await window.githulu.git.stashPush(repoId, message, includeUntracked);
        
        if (result?.success) {
          // Refresh stash list and status
          await this.fetchStashes(repoId);
          await this.fetchStatus(repoId);
        }

        this.endOperation(result?.success ?? false);
        return result;
      } catch (err) {
        this.addError(repoId, 'createStash', 'Failed to create stash', err);
        this.endOperation(false);
        return null;
      }
    },

    async popStash(repoId: string, index?: number): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'stashPop');

      try {
        const result = await window.githulu.git.stashPop(repoId, index);
        
        // Always refresh stash list and status (even on conflict)
        await this.fetchStashes(repoId);
        await this.fetchStatus(repoId);

        this.endOperation(result?.success ?? false);
        return result;
      } catch (err) {
        this.addError(repoId, 'popStash', 'Failed to pop stash', err);
        this.endOperation(false);
        return null;
      }
    },

    async applyStash(repoId: string, index: number): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'stashApply');

      try {
        const result = await window.githulu.git.stashApply(repoId, index);
        
        // Always refresh status (even on conflict)
        await this.fetchStatus(repoId);

        this.endOperation(result?.success ?? false);
        return result;
      } catch (err) {
        this.addError(repoId, 'applyStash', 'Failed to apply stash', err);
        this.endOperation(false);
        return null;
      }
    },

    async dropStash(repoId: string, index: number): Promise<OpResult | null> {
      if (!window.githulu) return null;

      this.startOperation(repoId, 'stashDrop');

      try {
        const result = await window.githulu.git.stashDrop(repoId, index);
        
        if (result?.success) {
          // Refresh stash list after dropping
          await this.fetchStashes(repoId);
        }

        this.endOperation(result?.success ?? false);
        return result;
      } catch (err) {
        this.addError(repoId, 'dropStash', 'Failed to drop stash', err);
        this.endOperation(false);
        return null;
      }
    },
  },
});
