import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';

let cachedGitPath: string | null = null;

/**
 * Resolve the git binary path.
 * Prefers /usr/bin/git, falls back to `which git`.
 */
export async function resolveGitBinary(): Promise<string> {
  if (cachedGitPath) {
    return cachedGitPath;
  }

  // First, check if /usr/bin/git exists
  const defaultPath = '/usr/bin/git';
  try {
    await fs.access(defaultPath, fs.constants.X_OK);
    cachedGitPath = defaultPath;
    return defaultPath;
  } catch {
    // /usr/bin/git not found or not executable
  }

  // Fall back to which git
  const gitPath = await findGitWithWhich();
  if (gitPath) {
    cachedGitPath = gitPath;
    return gitPath;
  }

  throw new Error(
    'Git not found. Please install Git and ensure it is available in your PATH.\n' +
    'You can install Git via Xcode Command Line Tools: xcode-select --install'
  );
}

async function findGitWithWhich(): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('which', ['git']);
    let stdout = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        resolve(null);
      }
    });

    child.on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Get the cached git path. Must call resolveGitBinary() first.
 */
export function getGitPath(): string {
  if (!cachedGitPath) {
    throw new Error('Git path not resolved. Call resolveGitBinary() first.');
  }
  return cachedGitPath;
}
