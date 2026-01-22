import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import {
  getStorage,
  getGroups,
  getRepoById,
  getRepoByPath,
  addRepo,
  removeRepo,
  addGroup,
  updateGroup,
  deleteGroup,
  moveRepo,
  reorderRepo,
  getUIState,
} from '../storage/index.js';
import { isGitRepository, getRepoRoot } from '../git/runner.js';
import type { Group, Repo } from '../../shared/types.js';

/**
 * Register all repository management IPC handlers
 */
export function registerReposHandlers(): void {
  // List all groups, repos, and UI state
  ipcMain.handle('githulu:repos:list', async () => {
    const storage = getStorage();
    return {
      groups: storage.groups,
      repos: storage.repos,
      ui: storage.ui,
    };
  });

  // Add a new repository
  ipcMain.handle('githulu:repos:add', async (_event, folderPath: string) => {
    // Validate input
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Invalid folder path');
    }

    // Check if it's a git repository
    const isRepo = await isGitRepository(folderPath);
    if (!isRepo) {
      throw new Error('The selected folder is not a Git repository');
    }

    // Get the repo root (in case user selected a subdirectory)
    const repoRoot = await getRepoRoot(folderPath);
    if (!repoRoot) {
      throw new Error('Could not determine repository root');
    }

    // Check if already added
    const existing = getRepoByPath(repoRoot);
    if (existing) {
      throw new Error('This repository has already been added');
    }

    // Extract display name from path
    const displayName = repoRoot.split('/').pop() || 'Unknown';

    // Create repo entry
    const repo: Repo = {
      id: `repo_${uuidv4().slice(0, 10)}`,
      path: repoRoot,
      displayName,
    };

    // Add to storage (will be added to default group)
    await addRepo(repo);

    return { repo };
  });

  // Remove a repository
  ipcMain.handle('githulu:repos:remove', async (_event, repoId: string) => {
    // Validate
    if (!repoId || typeof repoId !== 'string') {
      throw new Error('Invalid repo ID');
    }

    const repo = getRepoById(repoId);
    if (!repo) {
      throw new Error(`Repository not found: ${repoId}`);
    }

    await removeRepo(repoId);
  });

  // Create a new group
  ipcMain.handle('githulu:repos:createGroup', async (_event, name: string) => {
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid group name');
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Group name cannot be empty');
    }

    // Check for duplicate name
    const groups = getGroups();
    if (groups.some((g) => g.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error('A group with this name already exists');
    }

    const group: Group = {
      id: `grp_${uuidv4().slice(0, 10)}`,
      name: trimmedName,
      repoIds: [],
    };

    await addGroup(group);

    return { group };
  });

  // Rename a group
  ipcMain.handle(
    'githulu:repos:renameGroup',
    async (_event, groupId: string, name: string) => {
      if (!groupId || typeof groupId !== 'string') {
        throw new Error('Invalid group ID');
      }

      if (!name || typeof name !== 'string') {
        throw new Error('Invalid group name');
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Group name cannot be empty');
      }

      // Check for duplicate name (excluding current group)
      const groups = getGroups();
      if (
        groups.some(
          (g) =>
            g.id !== groupId &&
            g.name.toLowerCase() === trimmedName.toLowerCase()
        )
      ) {
        throw new Error('A group with this name already exists');
      }

      await updateGroup(groupId, { name: trimmedName });
    }
  );

  // Delete a group
  ipcMain.handle('githulu:repos:deleteGroup', async (_event, groupId: string) => {
    if (!groupId || typeof groupId !== 'string') {
      throw new Error('Invalid group ID');
    }

    await deleteGroup(groupId);
  });

  // Move a repo to a different group
  ipcMain.handle(
    'githulu:repos:moveRepo',
    async (_event, repoId: string, toGroupId: string, index: number) => {
      if (!repoId || typeof repoId !== 'string') {
        throw new Error('Invalid repo ID');
      }

      if (!toGroupId || typeof toGroupId !== 'string') {
        throw new Error('Invalid target group ID');
      }

      if (typeof index !== 'number' || index < 0) {
        throw new Error('Invalid index');
      }

      // Verify repo exists
      const repo = getRepoById(repoId);
      if (!repo) {
        throw new Error(`Repository not found: ${repoId}`);
      }

      await moveRepo(repoId, toGroupId, index);
    }
  );

  // Reorder a repo within its group
  ipcMain.handle(
    'githulu:repos:reorderRepo',
    async (_event, groupId: string, fromIndex: number, toIndex: number) => {
      if (!groupId || typeof groupId !== 'string') {
        throw new Error('Invalid group ID');
      }

      if (typeof fromIndex !== 'number' || fromIndex < 0) {
        throw new Error('Invalid fromIndex');
      }

      if (typeof toIndex !== 'number' || toIndex < 0) {
        throw new Error('Invalid toIndex');
      }

      await reorderRepo(groupId, fromIndex, toIndex);
    }
  );
}
