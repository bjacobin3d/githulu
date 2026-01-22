import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { FileChange, RebaseState, BranchInfo, StashInfo } from '../../shared/types.js';

/**
 * Parsed result from git status --porcelain=v2 -b
 */
export interface ParsedStatus {
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: FileChange[];
  conflicts: FileChange[];
}

/**
 * Parse git status --porcelain=v2 -b output
 */
export function parseStatusPorcelainV2(output: string): ParsedStatus {
  const result: ParsedStatus = {
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
    untracked: [],
    conflicts: [],
  };

  const lines = output.split('\n').filter(Boolean);

  for (const line of lines) {
    // Header lines start with #
    if (line.startsWith('# ')) {
      parseHeaderLine(line, result);
      continue;
    }

    // Ordinary changed entry: 1 XY ...
    if (line.startsWith('1 ')) {
      parseOrdinaryEntry(line, result);
      continue;
    }

    // Renamed/copied entry: 2 XY ...
    if (line.startsWith('2 ')) {
      parseRenamedEntry(line, result);
      continue;
    }

    // Unmerged entry: u XY ...
    if (line.startsWith('u ')) {
      parseUnmergedEntry(line, result);
      continue;
    }

    // Untracked entry: ? path
    if (line.startsWith('? ')) {
      const filePath = line.slice(2);
      result.untracked.push({
        path: filePath,
        status: '?',
        kind: 'untracked',
      });
      continue;
    }

    // Ignored entry: ! path (we ignore these)
    if (line.startsWith('! ')) {
      continue;
    }
  }

  return result;
}

function parseHeaderLine(line: string, result: ParsedStatus): void {
  // # branch.oid <commit>
  // # branch.head <branch>
  // # branch.upstream <upstream>
  // # branch.ab +<ahead> -<behind>

  const parts = line.slice(2).split(' ');
  const key = parts[0];

  switch (key) {
    case 'branch.head':
      result.branch = parts[1] === '(detached)' ? null : parts[1];
      break;
    case 'branch.upstream':
      result.upstream = parts[1];
      break;
    case 'branch.ab':
      // Format: +N -M
      for (const part of parts.slice(1)) {
        if (part.startsWith('+')) {
          result.ahead = parseInt(part.slice(1), 10) || 0;
        } else if (part.startsWith('-')) {
          result.behind = parseInt(part.slice(1), 10) || 0;
        }
      }
      break;
  }
}

function parseOrdinaryEntry(line: string, result: ParsedStatus): void {
  // Format: 1 XY sub mH mI mW hH hI path
  // XY is the status code (X = staged, Y = unstaged)
  const parts = line.split(' ');
  const xy = parts[1];
  const filePath = parts.slice(8).join(' '); // Path might have spaces

  const x = xy[0]; // Staged status
  const y = xy[1]; // Unstaged status

  // Check for staged changes
  if (x !== '.' && x !== '?') {
    result.staged.push({
      path: filePath,
      status: x,
      kind: 'staged',
    });
  }

  // Check for unstaged changes
  if (y !== '.' && y !== '?') {
    result.unstaged.push({
      path: filePath,
      status: y,
      kind: 'unstaged',
    });
  }
}

function parseRenamedEntry(line: string, result: ParsedStatus): void {
  // Format: 2 XY sub mH mI mW hH hI Xscore path\torigPath
  const parts = line.split('\t');
  const mainPart = parts[0].split(' ');
  const xy = mainPart[1];
  const newPath = mainPart.slice(9).join(' ');
  const oldPath = parts[1];

  const x = xy[0];
  const y = xy[1];

  if (x === 'R' || x === 'C') {
    result.staged.push({
      path: newPath,
      status: x,
      kind: 'staged',
      oldPath,
    });
  }

  if (y !== '.') {
    result.unstaged.push({
      path: newPath,
      status: y,
      kind: 'unstaged',
    });
  }
}

function parseUnmergedEntry(line: string, result: ParsedStatus): void {
  // Format: u XY sub m1 m2 m3 mW h1 h2 h3 path
  const parts = line.split(' ');
  const xy = parts[1];
  const filePath = parts.slice(10).join(' ');

  result.conflicts.push({
    path: filePath,
    status: xy,
    kind: 'conflict',
  });
}

/**
 * Detect if a rebase is in progress
 */
export async function detectRebaseState(repoPath: string): Promise<RebaseState> {
  const gitDir = path.join(repoPath, '.git');

  // Check for rebase-merge directory (interactive rebase)
  const rebaseMergePath = path.join(gitDir, 'rebase-merge');
  // Check for rebase-apply directory (non-interactive rebase or am)
  const rebaseApplyPath = path.join(gitDir, 'rebase-apply');

  const [hasMerge, hasApply] = await Promise.all([
    directoryExists(rebaseMergePath),
    directoryExists(rebaseApplyPath),
  ]);

  if (!hasMerge && !hasApply) {
    return { inProgress: false, conflicts: [] };
  }

  const rebasePath = hasMerge ? rebaseMergePath : rebaseApplyPath;

  // Try to read step info
  let step: number | undefined;
  let total: number | undefined;

  try {
    const msgnum = await fs.readFile(path.join(rebasePath, 'msgnum'), 'utf-8');
    step = parseInt(msgnum.trim(), 10);
  } catch {
    // Step info not available
  }

  try {
    const end = await fs.readFile(path.join(rebasePath, 'end'), 'utf-8');
    total = parseInt(end.trim(), 10);
  } catch {
    // Total info not available
  }

  return {
    inProgress: true,
    step,
    total,
    conflicts: [], // Will be filled from status parsing
  };
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Parse git branch --all --verbose output
 */
export function parseBranchList(output: string): {
  local: BranchInfo[];
  remote: BranchInfo[];
} {
  const local: BranchInfo[] = [];
  const remote: BranchInfo[] = [];

  const lines = output.split('\n').filter(Boolean);

  for (const line of lines) {
    const isCurrent = line.startsWith('*');
    
    // Remove the prefix: "* " for current branch or "  " for others
    // But only if the line actually starts with these prefixes
    let trimmed: string;
    if (line.startsWith('* ')) {
      trimmed = line.slice(2).trim();
    } else if (line.startsWith('  ')) {
      trimmed = line.slice(2).trim();
    } else {
      // No prefix to remove (shouldn't happen with normal git output)
      trimmed = line.trim();
    }

    // Split into name and rest
    const match = trimmed.match(/^(\S+)\s+([a-f0-9]+)?\s*(.*)?$/);
    if (!match) {
      continue;
    }

    const [, name, commit, description] = match;

    // Check if remote
    if (name.startsWith('remotes/')) {
      // Format: remotes/origin/branch-name
      const remoteName = name.replace('remotes/', '');

      // Skip HEAD pointers
      if (remoteName.includes('/HEAD')) continue;

      remote.push({
        name: remoteName,
        isCurrent: false,
        upstream: null,
        ahead: null,
        behind: null,
        lastCommit: commit,
      });
    } else {
      // Local branch
      // Try to parse tracking info from description
      // Format: [origin/main: ahead 1, behind 2] commit message
      // or: [origin/main] commit message
      let upstream: string | null = null;
      let ahead: number | null = null;
      let behind: number | null = null;

      const trackMatch = description?.match(/\[([^\]:]+)(?::\s*([^\]]+))?\]/);
      if (trackMatch) {
        upstream = trackMatch[1];
        const trackInfo = trackMatch[2];
        if (trackInfo) {
          const aheadMatch = trackInfo.match(/ahead (\d+)/);
          const behindMatch = trackInfo.match(/behind (\d+)/);
          if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
          if (behindMatch) behind = parseInt(behindMatch[1], 10);
        }
      }

      local.push({
        name,
        isCurrent,
        upstream,
        ahead,
        behind,
        lastCommit: commit,
      });
    }
  }

  return { local, remote };
}

/**
 * Parse unified diff output into structured format
 */
export interface ParsedDiff {
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  header: string;
  lines: DiffLineInfo[];
}

export interface DiffLineInfo {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function parseUnifiedDiff(diffText: string): ParsedDiff {
  const hunks: DiffHunk[] = [];
  const lines = diffText.split('\n');

  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }

      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[3], 10);

      currentHunk = {
        oldStart: oldLine,
        oldCount: parseInt(hunkMatch[2] || '1', 10),
        newStart: newLine,
        newCount: parseInt(hunkMatch[4] || '1', 10),
        header: line,
        lines: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    // Skip diff metadata lines
    if (line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('---') ||
        line.startsWith('+++') ||
        line.startsWith('\\')) {
      continue;
    }

    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'addition',
        content: line.slice(1),
        newLineNumber: newLine++,
      });
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'deletion',
        content: line.slice(1),
        oldLineNumber: oldLine++,
      });
    } else if (line.startsWith(' ') || line === '') {
      currentHunk.lines.push({
        type: 'context',
        content: line.slice(1),
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      });
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return { hunks };
}

/**
 * Parse git stash list output
 * Format: %gd|%gs|%H|%ci
 * Example: stash@{0}|WIP on main: commit message|abc123...|2024-01-15 10:30:00 -0800
 */
export function parseStashList(output: string): StashInfo[] {
  const stashes: StashInfo[] = [];
  
  if (!output || output.trim() === '') {
    return stashes;
  }

  const lines = output.split('\n').filter(Boolean);

  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length < 4) continue;

    const [ref, message, hash, isoDate] = parts;

    // Extract index from stash@{N}
    const indexMatch = ref.match(/stash@\{(\d+)\}/);
    if (!indexMatch) continue;

    const index = parseInt(indexMatch[1], 10);

    // Extract branch from message (format: "WIP on branch: message" or "On branch: message")
    let branch = 'unknown';
    let cleanMessage = message;
    const wipMatch = message.match(/^(?:WIP )?[Oo]n ([^:]+):\s*(.*)$/);
    if (wipMatch) {
      branch = wipMatch[1];
      cleanMessage = wipMatch[2] || message;
    }

    // Calculate relative date
    const date = new Date(isoDate);
    const relativeDate = getRelativeDate(date);

    stashes.push({
      index,
      message: cleanMessage,
      branch,
      hash,
      date: isoDate,
      relativeDate,
    });
  }

  return stashes;
}

/**
 * Convert a date to relative time (e.g., "2 hours ago")
 */
function getRelativeDate(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

