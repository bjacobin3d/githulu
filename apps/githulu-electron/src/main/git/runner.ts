import { spawn, ChildProcess } from 'node:child_process';
import { getGitPath } from './resolver.js';
import type { GitResult } from '../../shared/types.js';

export interface RunGitOptions {
  repoPath: string;
  args: string[];
  timeout?: number;
  onProgress?: (line: string) => void;
  signal?: AbortSignal;
}

// Default timeouts
const DEFAULT_TIMEOUT = 60_000; // 60 seconds
const LONG_TIMEOUT = 300_000; // 5 minutes for fetch/push

// Store active processes for cancellation
const activeProcesses = new Map<string, ChildProcess>();

/**
 * Run a git command and return the result
 */
export async function runGit(options: RunGitOptions): Promise<GitResult> {
  const {
    repoPath,
    args,
    timeout = DEFAULT_TIMEOUT,
    onProgress,
    signal,
  } = options;

  const gitPath = getGitPath();
  const fullArgs = ['-C', repoPath, ...args];

  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted) {
      reject(new Error('Operation was cancelled'));
      return;
    }

    const child = spawn(gitPath, fullArgs, {
      env: {
        ...process.env,
        // Ensure consistent output
        GIT_TERMINAL_PROMPT: '0',
        LANG: 'en_US.UTF-8',
      },
    });

    const processId = `${repoPath}:${Date.now()}`;
    activeProcesses.set(processId, child);

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Handle abort signal
    const abortHandler = () => {
      killed = true;
      child.kill('SIGTERM');
    };
    signal?.addEventListener('abort', abortHandler);

    // Set timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, timeout);

    // Collect stdout
    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      stdout += text;

      // Stream progress for operations that output to stdout
      if (onProgress) {
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          onProgress(line);
        }
      }
    });

    // Collect stderr (often used for progress in git)
    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      stderr += text;

      // Stream progress
      if (onProgress) {
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          onProgress(line);
        }
      }
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortHandler);
      activeProcesses.delete(processId);

      if (killed && signal?.aborted) {
        reject(new Error('Operation was cancelled'));
        return;
      }

      if (killed) {
        reject(new Error('Operation timed out'));
        return;
      }

      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortHandler);
      activeProcesses.delete(processId);
      reject(error);
    });
  });
}

/**
 * Run a quick git command (status, diff, etc.)
 */
export async function runGitQuick(
  repoPath: string,
  args: string[]
): Promise<GitResult> {
  return runGit({ repoPath, args, timeout: DEFAULT_TIMEOUT });
}

/**
 * Run a long git command (fetch, push, rebase, etc.)
 */
export async function runGitLong(
  repoPath: string,
  args: string[],
  onProgress?: (line: string) => void,
  signal?: AbortSignal
): Promise<GitResult> {
  return runGit({
    repoPath,
    args,
    timeout: LONG_TIMEOUT,
    onProgress,
    signal,
  });
}

/**
 * Validate that a path is a git repository
 */
export async function isGitRepository(path: string): Promise<boolean> {
  try {
    const result = await runGitQuick(path, ['rev-parse', '--is-inside-work-tree']);
    return result.success && result.stdout === 'true';
  } catch {
    return false;
  }
}

/**
 * Get the root of a git repository
 */
export async function getRepoRoot(path: string): Promise<string | null> {
  try {
    const result = await runGitQuick(path, ['rev-parse', '--show-toplevel']);
    return result.success ? result.stdout : null;
  } catch {
    return null;
  }
}

/**
 * Kill all active git processes (for cleanup)
 */
export function killAllGitProcesses(): void {
  for (const [id, process] of activeProcesses) {
    process.kill('SIGTERM');
    activeProcesses.delete(id);
  }
}
