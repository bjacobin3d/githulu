import * as chokidar from 'chokidar';
import * as path from 'node:path';
import { sendToRenderer } from '../window.js';
import { queueOperation } from '../git/queue.js';
import { runGitQuick } from '../git/runner.js';
import { parseStatusPorcelainV2, detectRebaseState } from '../git/parser.js';
import { setRepoStatusCache } from '../cache/repo-state.js';
import type { RepoStatus } from '../../shared/types.js';

// Active watchers keyed by repo ID
const watchers = new Map<string, chokidar.FSWatcher>();

// Debounce timers keyed by repo ID
const debounceTimers = new Map<string, NodeJS.Timeout>();

// Debounce delay in ms
const DEBOUNCE_DELAY = 300;

/**
 * Start watching a repository for changes
 */
export function startWatching(repoId: string, repoPath: string): void {
  // Don't start if already watching
  if (watchers.has(repoId)) {
    return;
  }

  const gitDir = path.join(repoPath, '.git');

  // Watch the entire repo for working directory changes, plus specific .git files
  const watcher = chokidar.watch(repoPath, {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    // Ignore patterns for performance
    ignored: [
      // Ignore .git internals except specific files we care about
      (filePath: string) => {
        // Always watch these .git files
        const watchedGitFiles = [path.join(gitDir, 'HEAD'), path.join(gitDir, 'index')];
        if (watchedGitFiles.includes(filePath)) return false;

        // Watch refs directories
        if (filePath.startsWith(path.join(gitDir, 'refs'))) return false;
        if (filePath.startsWith(path.join(gitDir, 'rebase-merge'))) return false;
        if (filePath.startsWith(path.join(gitDir, 'rebase-apply'))) return false;

        // Ignore all other .git contents
        if (filePath.startsWith(gitDir + path.sep) || filePath === gitDir) return true;

        return false;
      },
      // Ignore common large/noisy directories
      '**/node_modules/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/__pycache__/**',
      '**/venv/**',
      '**/.venv/**',
      '**/coverage/**',
      '**/.cache/**',
    ],
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('all', (_event, _filePath) => {
    // Debounce rapid changes
    debouncedRefresh(repoId, repoPath);
  });

  watcher.on('error', (error) => {
    console.error(`[githulu] Watcher error for ${repoId}:`, error);
  });

  watchers.set(repoId, watcher);
  console.log(`[githulu] Started watching: ${repoId}`);
}

/**
 * Stop watching a repository
 */
export function stopWatching(repoId: string): void {
  const watcher = watchers.get(repoId);
  if (watcher) {
    watcher.close();
    watchers.delete(repoId);
    console.log(`[githulu] Stopped watching: ${repoId}`);
  }

  // Clear any pending debounce
  const timer = debounceTimers.get(repoId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(repoId);
  }
}

/**
 * Stop all watchers
 */
export function stopAllWatchers(): void {
  for (const [repoId] of watchers) {
    stopWatching(repoId);
  }
}

/**
 * Check if a repository is being watched
 */
export function isWatching(repoId: string): boolean {
  return watchers.has(repoId);
}

/**
 * Debounced refresh - coalesces rapid changes into a single refresh
 */
function debouncedRefresh(repoId: string, repoPath: string): void {
  // Clear existing timer
  const existingTimer = debounceTimers.get(repoId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    debounceTimers.delete(repoId);
    refreshRepoStatus(repoId, repoPath);
  }, DEBOUNCE_DELAY);

  debounceTimers.set(repoId, timer);
}

/**
 * Refresh repository status and emit to renderer
 */
async function refreshRepoStatus(repoId: string, repoPath: string): Promise<void> {
  try {
    const status = await queueOperation(repoPath, 'high', async () => {
      const statusResult = await runGitQuick(repoPath, ['status', '--porcelain=v2', '-b']);

      if (!statusResult.success) {
        throw new Error(`Failed to get status: ${statusResult.stderr}`);
      }

      const parsed = parseStatusPorcelainV2(statusResult.stdout);
      const rebaseState = await detectRebaseState(repoPath);

      if (rebaseState.inProgress) {
        rebaseState.conflicts = parsed.conflicts.map((c) => c.path);
      }

      const status: RepoStatus = {
        repoId,
        path: repoPath,
        branch: parsed.branch,
        upstream: parsed.upstream,
        ahead: parsed.ahead,
        behind: parsed.behind,
        isDirty:
          parsed.staged.length > 0 || parsed.unstaged.length > 0 || parsed.untracked.length > 0,
        rebase: rebaseState,
        changes: {
          staged: parsed.staged,
          unstaged: parsed.unstaged,
          untracked: parsed.untracked,
        },
        lastUpdatedAt: Date.now(),
      };

      return status;
    });

    // Cache and emit
    setRepoStatusCache(repoId, status);
    sendToRenderer('githulu:event:repoStatusUpdated', { repoId, status });

    // Also emit rebase state if in progress
    if (status.rebase.inProgress) {
      sendToRenderer('githulu:event:rebaseStateChanged', {
        repoId,
        state: status.rebase,
      });
    }
  } catch (error) {
    console.error(`[githulu] Status refresh failed for ${repoId}:`, error);
    sendToRenderer('githulu:event:operationError', {
      repoId,
      opId: 'watcher_refresh',
      message: 'Failed to refresh repository status',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
