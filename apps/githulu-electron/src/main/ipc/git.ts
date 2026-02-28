import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getRepoById } from '../storage/index.js';
import { runGitQuick, runGitLong } from '../git/runner.js';
import { queueOperation } from '../git/queue.js';
import {
  parseStatusPorcelainV2,
  detectRebaseState,
  parseBranchList,
  parseStashList,
} from '../git/parser.js';
import { sendToRenderer } from '../window.js';
import { getRepoStatusCache, setRepoStatusCache } from '../cache/repo-state.js';
import { startWatching } from '../watchers/repo-watcher.js';
import type {
  RepoStatus,
  OpResult,
  DiffResult,
  BranchesResult,
  LogResult,
  CommitInfo,
  CommitDetailResult,
  CommitFileChange,
  StashListResult,
} from '../../shared/types.js';

/**
 * Validate repo ID and get path
 */
function validateAndGetRepoPath(repoId: string): string {
  if (!repoId || typeof repoId !== 'string') {
    throw new Error('Invalid repo ID');
  }

  const repo = getRepoById(repoId);
  if (!repo) {
    throw new Error(`Repository not found: ${repoId}`);
  }

  return repo.path;
}

/**
 * Create an operation result
 */
function createOpResult(success: boolean, stdout?: string, stderr?: string): OpResult {
  return {
    opId: `op_${uuidv4().slice(0, 8)}`,
    success,
    stdout,
    stderr,
  };
}

/**
 * Emit progress event to renderer
 */
function emitProgress(repoId: string, opId: string, line: string): void {
  sendToRenderer('githulu:event:operationProgress', { repoId, opId, line });
}

/**
 * Register all git operation IPC handlers
 */
export function registerGitHandlers(): void {
  // Get status (returns cached if available, triggers refresh)
  ipcMain.handle('githulu:git:status', async (_event, repoId: string) => {
    const repoPath = validateAndGetRepoPath(repoId);

    // Return cached status if available
    const cached = getRepoStatusCache(repoId);
    if (cached) {
      // Trigger background refresh
      refreshStatusInBackground(repoId, repoPath);
      return cached;
    }

    // No cache, do synchronous refresh
    return await fetchStatus(repoId, repoPath);
  });

  // Force refresh status
  ipcMain.handle('githulu:git:refreshStatus', async (_event, repoId: string) => {
    const repoPath = validateAndGetRepoPath(repoId);
    return await fetchStatus(repoId, repoPath);
  });

  // Fetch from remote
  // NOTE: Fetch should ALWAYS work regardless of working directory state (staged/unstaged changes,
  // rebase in progress, etc.) because it only updates remote tracking branches without touching
  // the working directory. There should be NO validation that blocks fetch based on isDirty or
  // rebase state.
  ipcMain.handle('githulu:git:fetch', async (_event, repoId: string, remote?: string) => {
    const repoPath = validateAndGetRepoPath(repoId);
    const opId = `op_${uuidv4().slice(0, 8)}`;

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      const result = await runGitLong(repoPath, ['fetch', remote || 'origin', '--prune'], (line) =>
        emitProgress(repoId, opId, line)
      );

      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    if (opResult.success) {
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after fetch:', err);
      });
    }

    return opResult;
  });

  // Push to remote
  ipcMain.handle('githulu:git:push', async (_event, repoId: string, branch: string) => {
    const repoPath = validateAndGetRepoPath(repoId);
    const opId = `op_${uuidv4().slice(0, 8)}`;

    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name');
    }

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      const result = await runGitLong(repoPath, ['push', 'origin', branch], (line) =>
        emitProgress(repoId, opId, line)
      );

      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    if (opResult.success) {
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after push:', err);
      });
    }

    return opResult;
  });

  // Publish branch (push with upstream)
  ipcMain.handle('githulu:git:publish', async (_event, repoId: string, branch: string) => {
    const repoPath = validateAndGetRepoPath(repoId);
    const opId = `op_${uuidv4().slice(0, 8)}`;

    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name');
    }

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      const result = await runGitLong(repoPath, ['push', '-u', 'origin', branch], (line) =>
        emitProgress(repoId, opId, line)
      );

      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    if (opResult.success) {
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after publish:', err);
      });
    }

    return opResult;
  });

  // Pull from remote
  // NOTE: Pull with --rebase REQUIRES a clean working directory (no unstaged changes).
  // UI should validate isDirty before calling this. Git will reject pull --rebase with
  // uncommitted changes to prevent conflicts during the rebase operation.
  ipcMain.handle(
    'githulu:git:pull',
    async (_event, repoId: string, options?: { remote?: string; rebase?: boolean }) => {
      const repoPath = validateAndGetRepoPath(repoId);
      const opId = `op_${uuidv4().slice(0, 8)}`;

      const remote = options?.remote || 'origin';
      const useRebase = options?.rebase ?? true; // Default to rebase (as per spec)

      const opResult = await queueOperation(repoPath, 'medium', async () => {
        const args = useRebase ? ['pull', '--rebase', remote] : ['pull', remote];

        const result = await runGitLong(repoPath, args, (line) => emitProgress(repoId, opId, line));

        return createOpResult(result.success, result.stdout, result.stderr);
      });

      // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after pull:', err);
      });

      return opResult;
    }
  );

  // Push with options (supports force push)
  ipcMain.handle(
    'githulu:git:pushWithOptions',
    async (
      _event,
      repoId: string,
      branch: string,
      options?: { force?: boolean; forceWithLease?: boolean; remote?: string }
    ) => {
      const repoPath = validateAndGetRepoPath(repoId);
      const opId = `op_${uuidv4().slice(0, 8)}`;

      if (!branch || typeof branch !== 'string') {
        throw new Error('Invalid branch name');
      }

      const remote = options?.remote || 'origin';

      const opResult = await queueOperation(repoPath, 'medium', async () => {
        const args = ['push'];

        // Force push with lease is safer than force
        if (options?.forceWithLease) {
          args.push('--force-with-lease');
        } else if (options?.force) {
          args.push('--force');
        }

        args.push(remote, branch);

        const result = await runGitLong(repoPath, args, (line) => emitProgress(repoId, opId, line));

        return createOpResult(result.success, result.stdout, result.stderr);
      });

      // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
      if (opResult.success) {
        fetchStatus(repoId, repoPath).catch((err) => {
          console.warn('[githulu] Failed to fetch status after push:', err);
        });
      }

      return opResult;
    }
  );

  // Get branches
  ipcMain.handle('githulu:git:branches', async (_event, repoId: string) => {
    console.log(`[githulu] git:branches called for repoId: ${repoId}`);
    const repoPath = validateAndGetRepoPath(repoId);
    console.log(`[githulu] git:branches repoPath: ${repoPath}`);

    const result = await queueOperation(repoPath, 'low', async () => {
      console.log(`[githulu] git:branches executing git command...`);
      // Use -vv (double verbose) to get upstream tracking info with ahead/behind counts
      const gitResult = await runGitQuick(repoPath, ['branch', '--all', '-vv']);

      if (!gitResult.success) {
        console.error(`[githulu] git:branches failed:`, gitResult.stderr);
        throw new Error(`Failed to get branches: ${gitResult.stderr}`);
      }

      const parsed = parseBranchList(gitResult.stdout);
      return parsed;
    });

    return result;
  });

  // Get commit log
  ipcMain.handle(
    'githulu:git:log',
    async (_event, repoId: string, count: number = 50, skip: number = 0) => {
      console.log(`[githulu] git:log called for repoId: ${repoId}, count: ${count}, skip: ${skip}`);
      const repoPath = validateAndGetRepoPath(repoId);
      console.log(`[githulu] git:log repoPath: ${repoPath}`);

      const result = await queueOperation(repoPath, 'low', async () => {
        console.log(`[githulu] git:log executing git command...`);
        // Use custom delimiters that won't appear in normal commit messages
        const FIELD_SEP = '<|>';
        const COMMIT_SEP = '---END---';
        const format = `%H${FIELD_SEP}%h${FIELD_SEP}%s${FIELD_SEP}%b${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%aI${FIELD_SEP}%ar${FIELD_SEP}%D${COMMIT_SEP}`;

        // Helper to parse commit blocks
        const parseCommits = (stdout: string, isUpstream: boolean): CommitInfo[] => {
          const commitBlocks = stdout
            .split(COMMIT_SEP)
            .map((block) => block.trim())
            .filter((block) => block.length > 0 && block.includes(FIELD_SEP));

          return commitBlocks.map((block) => {
            const parts = block.split(FIELD_SEP);
            const [hash, shortHash, subject, body, author, authorEmail, date, relativeDate, refsStr] = parts;
            const refs = refsStr
              ? refsStr.split(',').map((r) => r.trim()).filter(Boolean)
              : [];

            return {
              hash: hash || '',
              shortHash: shortHash || '',
              subject: subject || '',
              body: (body || '').trim(),
              author: author || '',
              authorEmail: authorEmail || '',
              date: date || '',
              relativeDate: relativeDate || '',
              refs,
              isUpstream,
            };
          });
        };

        // Get local commits
        const gitResult = await runGitQuick(repoPath, [
          'log',
          `--format=${format}`,
          `-n`,
          String(count + 1),
          `--skip=${skip}`,
        ]);

        if (!gitResult.success) {
          console.error(`[githulu] git:log failed:`, gitResult.stderr);
          throw new Error(`Failed to get log: ${gitResult.stderr}`);
        }

        let localCommits = parseCommits(gitResult.stdout, false);
        const hasMoreLocal = localCommits.length > count;
        if (hasMoreLocal) {
          localCommits = localCommits.slice(0, count);
        }

        // Check if we should fetch upstream commits (only on first page)
        let upstreamCommits: CommitInfo[] = [];
        if (skip === 0) {
          const cachedStatus = getRepoStatusCache(repoId);
          if (cachedStatus?.upstream && cachedStatus.behind > 0) {
            console.log(
              `[githulu] git:log fetching ${cachedStatus.behind} upstream commits from ${cachedStatus.upstream}`
            );
            const upstreamResult = await runGitQuick(repoPath, [
              'log',
              `--format=${format}`,
              `HEAD..${cachedStatus.upstream}`,
            ]);

            if (upstreamResult.success) {
              upstreamCommits = parseCommits(upstreamResult.stdout, true);
              console.log(`[githulu] git:log found ${upstreamCommits.length} upstream commits`);
            }
          }
        }

        // Merge and sort by date (newest first)
        const allCommits = [...upstreamCommits, ...localCommits].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        console.log(
          `[githulu] git:log returning ${allCommits.length} commits (${upstreamCommits.length} upstream), hasMore: ${hasMoreLocal}`
        );
        return {
          commits: allCommits,
          hasMore: hasMoreLocal,
        } as LogResult;
      });

      return result;
    }
  );

  // Get commit details (files changed in a specific commit)
  ipcMain.handle('githulu:git:showCommit', async (_event, repoId: string, hash: string) => {
    const repoPath = validateAndGetRepoPath(repoId);

    if (!hash || typeof hash !== 'string') {
      throw new Error('Invalid commit hash');
    }

    return queueOperation(repoPath, 'low', async () => {
      // Get commit info with safe delimiters (same as log)
      const FIELD_SEP = '<|>';
      const format = `%H${FIELD_SEP}%h${FIELD_SEP}%s${FIELD_SEP}%b${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%aI${FIELD_SEP}%ar${FIELD_SEP}%D`;
      const infoResult = await runGitQuick(repoPath, ['show', '-s', `--format=${format}`, hash]);

      if (!infoResult.success) {
        throw new Error(`Failed to get commit info: ${infoResult.stderr}`);
      }

      const infoParts = infoResult.stdout.trim().split(FIELD_SEP);
      const [
        commitHash,
        shortHash,
        subject,
        body,
        author,
        authorEmail,
        date,
        relativeDate,
        refsStr,
      ] = infoParts;

      const refs = refsStr
        ? refsStr
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean)
        : [];

      // Get list of files changed in the commit
      const filesResult = await runGitQuick(repoPath, ['show', '--name-status', '--format=', hash]);

      if (!filesResult.success) {
        throw new Error(`Failed to get commit files: ${filesResult.stderr}`);
      }

      const files: CommitFileChange[] = filesResult.stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          // Format: STATUS<TAB>FILE or STATUS<TAB>OLD_FILE<TAB>NEW_FILE for renames
          const parts = line.split('\t');
          const status = parts[0].charAt(0); // First char of status (ignore percentage for renames)

          if (status === 'R' || status === 'C') {
            // Rename or copy: old file to new file
            return {
              path: parts[2] || parts[1],
              status,
              oldPath: parts[1],
            };
          }

          return {
            path: parts[1],
            status,
          };
        });

      return {
        hash: commitHash || hash,
        shortHash: shortHash || '',
        subject: subject || '',
        body: body || '',
        author: author || '',
        authorEmail: authorEmail || '',
        date: date || '',
        relativeDate: relativeDate || '',
        refs,
        files,
      } as CommitDetailResult;
    });
  });

  // Get diff for a file in a specific commit
  ipcMain.handle(
    'githulu:git:diffCommitFile',
    async (_event, repoId: string, hash: string, filePath: string) => {
      const repoPath = validateAndGetRepoPath(repoId);

      if (!hash || typeof hash !== 'string') {
        throw new Error('Invalid commit hash');
      }

      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      return queueOperation(repoPath, 'high', async () => {
        const result = await runGitQuick(repoPath, ['show', hash, '--', filePath]);

        return {
          filePath,
          staged: false,
          diffText: result.stdout,
        } as DiffResult;
      });
    }
  );

  // Create branch
  ipcMain.handle(
    'githulu:git:createBranch',
    async (_event, repoId: string, name: string, from: string) => {
      const repoPath = validateAndGetRepoPath(repoId);

      if (!name || typeof name !== 'string') {
        throw new Error('Invalid branch name');
      }

      if (!from || typeof from !== 'string') {
        throw new Error('Invalid base branch');
      }

      const opResult = await queueOperation(repoPath, 'medium', async () => {
        const result = await runGitQuick(repoPath, ['switch', '-c', name, from]);
        return createOpResult(result.success, result.stdout, result.stderr);
      });

      // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
      if (opResult.success) {
        // Fire and forget - don't block return
        fetchStatus(repoId, repoPath).catch((err) => {
          console.warn('[githulu] Failed to fetch status after branch create:', err);
        });
      }

      return opResult;
    }
  );

  // Rename branch
  ipcMain.handle(
    'githulu:git:renameBranch',
    async (_event, repoId: string, oldName: string, newName: string) => {
      const repoPath = validateAndGetRepoPath(repoId);

      if (!oldName || typeof oldName !== 'string') {
        throw new Error('Invalid current branch name');
      }

      if (!newName || typeof newName !== 'string') {
        throw new Error('Invalid new branch name');
      }

      const opResult = await queueOperation(repoPath, 'medium', async () => {
        const result = await runGitQuick(repoPath, ['branch', '-m', oldName, newName]);
        return createOpResult(result.success, result.stdout, result.stderr);
      });

      if (opResult.success) {
        fetchStatus(repoId, repoPath).catch((err) => {
          console.warn('[githulu] Failed to fetch status after branch rename:', err);
        });
      }

      return opResult;
    }
  );

  // Track remote branch
  ipcMain.handle(
    'githulu:git:trackBranch',
    async (_event, repoId: string, remoteBranch: string, localName?: string) => {
      const repoPath = validateAndGetRepoPath(repoId);

      if (!remoteBranch || typeof remoteBranch !== 'string') {
        throw new Error('Invalid remote branch');
      }

      // Default local name to the branch name without remote prefix
      const branchName = localName || remoteBranch.replace(/^origin\//, '');

      const opResult = await queueOperation(repoPath, 'medium', async () => {
        const result = await runGitQuick(repoPath, [
          'switch',
          '-c',
          branchName,
          '--track',
          remoteBranch,
        ]);
        return createOpResult(result.success, result.stdout, result.stderr);
      });

      // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
      if (opResult.success) {
        fetchStatus(repoId, repoPath).catch((err) => {
          console.warn('[githulu] Failed to fetch status after track branch:', err);
        });
      }

      return opResult;
    }
  );

  // Switch branch
  ipcMain.handle('githulu:git:switchBranch', async (_event, repoId: string, name: string) => {
    console.log(`[githulu] git:switchBranch called for repoId: ${repoId}, branch: ${name}`);
    const repoPath = validateAndGetRepoPath(repoId);

    if (!name || typeof name !== 'string') {
      throw new Error('Invalid branch name');
    }

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      console.log(`[githulu] git:switchBranch executing git switch ${name}`);
      const result = await runGitQuick(repoPath, ['switch', name]);
      console.log(
        `[githulu] git:switchBranch result:`,
        result.success,
        result.stdout,
        result.stderr
      );
      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    if (opResult.success) {
      console.log(`[githulu] git:switchBranch success, refreshing status`);
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after switch branch:', err);
      });
    }

    console.log(`[githulu] git:switchBranch returning:`, opResult);
    return opResult;
  });

  // Get diff for a file
  ipcMain.handle(
    'githulu:git:diff',
    async (_event, repoId: string, filePath: string, staged: boolean) => {
      const repoPath = validateAndGetRepoPath(repoId);

      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      return queueOperation(repoPath, 'high', async () => {
        const args = staged ? ['diff', '--cached', '--', filePath] : ['diff', '--', filePath];

        const result = await runGitQuick(repoPath, args);

        return {
          filePath,
          staged,
          diffText: result.stdout,
        } as DiffResult;
      });
    }
  );

  // Stage a file
  ipcMain.handle('githulu:git:stageFile', async (_event, repoId: string, filePath: string) => {
    const repoPath = validateAndGetRepoPath(repoId);

    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }

    const opResult = await queueOperation(repoPath, 'high', async () => {
      const result = await runGitQuick(repoPath, ['add', '--', filePath]);
      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    if (opResult.success) {
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after stage file:', err);
      });
    }

    return opResult;
  });

  // Unstage a file
  ipcMain.handle('githulu:git:unstageFile', async (_event, repoId: string, filePath: string) => {
    const repoPath = validateAndGetRepoPath(repoId);

    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }

    const opResult = await queueOperation(repoPath, 'high', async () => {
      const result = await runGitQuick(repoPath, ['reset', 'HEAD', '--', filePath]);
      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    if (opResult.success) {
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after unstage file:', err);
      });
    }

    return opResult;
  });

  // Stage all files
  ipcMain.handle('githulu:git:stageAll', async (_event, repoId: string) => {
    const repoPath = validateAndGetRepoPath(repoId);

    const opResult = await queueOperation(repoPath, 'high', async () => {
      const result = await runGitQuick(repoPath, ['add', '-A']);
      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    if (opResult.success) {
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after stage all:', err);
      });
    }

    return opResult;
  });

  // Create commit
  ipcMain.handle('githulu:git:commit', async (_event, repoId: string, message: string) => {
    const repoPath = validateAndGetRepoPath(repoId);

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Error('Commit message cannot be empty');
    }

    const opResult = await queueOperation(repoPath, 'high', async () => {
      const result = await runGitQuick(repoPath, ['commit', '-m', message]);
      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    if (opResult.success) {
      fetchStatus(repoId, repoPath).catch((err) => {
        console.warn('[githulu] Failed to fetch status after commit:', err);
      });
    }

    return opResult;
  });

  // Start rebase
  ipcMain.handle('githulu:git:rebaseStart', async (_event, repoId: string, onto: string) => {
    const repoPath = validateAndGetRepoPath(repoId);
    const opId = `op_${uuidv4().slice(0, 8)}`;

    if (!onto || typeof onto !== 'string') {
      throw new Error('Invalid rebase target');
    }

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      const result = await runGitLong(repoPath, ['rebase', onto], (line) =>
        emitProgress(repoId, opId, line)
      );

      // Emit rebase state change
      const rebaseState = await detectRebaseState(repoPath);
      sendToRenderer('githulu:event:rebaseStateChanged', {
        repoId,
        state: rebaseState,
      });

      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    fetchStatus(repoId, repoPath).catch((err) => {
      console.warn('[githulu] Failed to fetch status after rebase:', err);
    });

    return opResult;
  });

  // Continue rebase
  ipcMain.handle('githulu:git:rebaseContinue', async (_event, repoId: string) => {
    const repoPath = validateAndGetRepoPath(repoId);
    const opId = `op_${uuidv4().slice(0, 8)}`;

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      const result = await runGitLong(repoPath, ['rebase', '--continue'], (line) =>
        emitProgress(repoId, opId, line)
      );

      const rebaseState = await detectRebaseState(repoPath);
      sendToRenderer('githulu:event:rebaseStateChanged', {
        repoId,
        state: rebaseState,
      });

      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    fetchStatus(repoId, repoPath).catch((err) => {
      console.warn('[githulu] Failed to fetch status after rebase continue:', err);
    });

    return opResult;
  });

  // Abort rebase
  ipcMain.handle('githulu:git:rebaseAbort', async (_event, repoId: string) => {
    const repoPath = validateAndGetRepoPath(repoId);

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      const result = await runGitQuick(repoPath, ['rebase', '--abort']);

      const rebaseState = await detectRebaseState(repoPath);
      sendToRenderer('githulu:event:rebaseStateChanged', {
        repoId,
        state: rebaseState,
      });

      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
    fetchStatus(repoId, repoPath).catch((err) => {
      console.warn('[githulu] Failed to fetch status after rebase abort:', err);
    });

    return opResult;
  });

  // List stashes
  ipcMain.handle('githulu:git:stashList', async (_event, repoId: string) => {
    const repoPath = validateAndGetRepoPath(repoId);

    return queueOperation(repoPath, 'low', async () => {
      // Use safe delimiter for stash list
      const FIELD_SEP = '<|>';
      const result = await runGitQuick(repoPath, [
        'stash',
        'list',
        `--format=%gd${FIELD_SEP}%gs${FIELD_SEP}%H${FIELD_SEP}%ci`,
      ]);

      if (!result.success) {
        throw new Error(`Failed to list stashes: ${result.stderr}`);
      }

      const stashes = parseStashList(result.stdout, FIELD_SEP);
      return { stashes };
    });
  });

  // Create stash
  ipcMain.handle(
    'githulu:git:stashPush',
    async (_event, repoId: string, message?: string, includeUntracked?: boolean) => {
      const repoPath = validateAndGetRepoPath(repoId);

      const opResult = await queueOperation(repoPath, 'high', async () => {
        const args = ['stash', 'push'];

        if (message) {
          args.push('-m', message);
        }

        if (includeUntracked) {
          args.push('-u');
        }

        const result = await runGitQuick(repoPath, args);
        return createOpResult(result.success, result.stdout, result.stderr);
      });

      // Trigger status refresh AFTER the queued operation completes (avoid deadlock)
      if (opResult.success) {
        fetchStatus(repoId, repoPath).catch((err) => {
          console.warn('[githulu] Failed to fetch status after stash push:', err);
        });
      }

      return opResult;
    }
  );

  // Pop stash
  ipcMain.handle('githulu:git:stashPop', async (_event, repoId: string, index?: number) => {
    const repoPath = validateAndGetRepoPath(repoId);

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      const args = ['stash', 'pop'];

      if (index !== undefined) {
        args.push(`stash@{${index}}`);
      }

      const result = await runGitQuick(repoPath, args);
      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Always refresh status after pop (whether success or conflict)
    fetchStatus(repoId, repoPath).catch((err) => {
      console.warn('[githulu] Failed to fetch status after stash pop:', err);
    });

    return opResult;
  });

  // Apply stash
  ipcMain.handle('githulu:git:stashApply', async (_event, repoId: string, index: number) => {
    const repoPath = validateAndGetRepoPath(repoId);

    if (typeof index !== 'number') {
      throw new Error('Invalid stash index');
    }

    const opResult = await queueOperation(repoPath, 'medium', async () => {
      const result = await runGitQuick(repoPath, ['stash', 'apply', `stash@{${index}}`]);
      return createOpResult(result.success, result.stdout, result.stderr);
    });

    // Always refresh status after apply (whether success or conflict)
    fetchStatus(repoId, repoPath).catch((err) => {
      console.warn('[githulu] Failed to fetch status after stash apply:', err);
    });

    return opResult;
  });

  // Drop stash
  ipcMain.handle('githulu:git:stashDrop', async (_event, repoId: string, index: number) => {
    const repoPath = validateAndGetRepoPath(repoId);

    if (typeof index !== 'number') {
      throw new Error('Invalid stash index');
    }

    return queueOperation(repoPath, 'low', async () => {
      const result = await runGitQuick(repoPath, ['stash', 'drop', `stash@{${index}}`]);
      return createOpResult(result.success, result.stdout, result.stderr);
    });
  });
}

/**
 * Fetch and cache status for a repository
 */
async function fetchStatus(repoId: string, repoPath: string): Promise<RepoStatus> {
  console.log(`[githulu] fetchStatus called for ${repoId}`);
  return queueOperation(repoPath, 'high', async () => {
    console.log(`[githulu] fetchStatus executing for ${repoId}`);
    // Get status
    const statusResult = await runGitQuick(repoPath, ['status', '--porcelain=v2', '-b']);

    if (!statusResult.success) {
      console.error(`[githulu] fetchStatus git command failed for ${repoId}`);
      throw new Error(`Failed to get status: ${statusResult.stderr}`);
    }

    console.log(`[githulu] fetchStatus parsing for ${repoId}`);
    const parsed = parseStatusPorcelainV2(statusResult.stdout);

    // Check rebase state
    console.log(`[githulu] fetchStatus detecting rebase state for ${repoId}`);
    const rebaseState = await detectRebaseState(repoPath);

    // If in rebase, add conflict files to rebase state
    if (rebaseState.inProgress) {
      rebaseState.conflicts = parsed.conflicts.map((c) => c.path);
    }

    console.log(`[githulu] fetchStatus building status object for ${repoId}`);
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

    // Cache and emit
    setRepoStatusCache(repoId, status);
    sendToRenderer('githulu:event:repoStatusUpdated', { repoId, status });

    // Start watching for file changes (auto-refresh)
    startWatching(repoId, repoPath);

    console.log(`[githulu] fetchStatus completed for ${repoId}`);
    return status;
  });
}

/**
 * Refresh status in background (non-blocking)
 */
function refreshStatusInBackground(repoId: string, repoPath: string): void {
  fetchStatus(repoId, repoPath).catch((error) => {
    console.error(`[githulu] Background status refresh failed for ${repoId}:`, error);
    sendToRenderer('githulu:event:operationError', {
      repoId,
      opId: 'status_refresh',
      message: 'Failed to refresh repository status',
      details: error instanceof Error ? error.message : String(error),
    });
  });
}
