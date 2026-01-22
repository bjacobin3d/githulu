import { app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { StorageSchema, Group, Repo, UIState } from '../../shared/types.js';
import { migrate } from './migrations.js';

const CURRENT_VERSION = 1;
const STORAGE_FILENAME = 'githulu.json';

let storageData: StorageSchema | null = null;
let storagePath: string | null = null;

/**
 * Initialize storage - must be called before any other storage operations
 */
export async function initStorage(): Promise<void> {
  const userDataPath = app.getPath('userData');
  storagePath = path.join(userDataPath, STORAGE_FILENAME);

  try {
    const content = await fs.readFile(storagePath, 'utf-8');
    const parsed = JSON.parse(content) as StorageSchema;

    // Apply migrations if needed
    if (parsed.version < CURRENT_VERSION) {
      storageData = migrate(parsed, parsed.version, CURRENT_VERSION);
      await saveStorage();
    } else {
      storageData = parsed;
    }
  } catch (error) {
    // File doesn't exist or is invalid - create default
    storageData = createDefaultStorage();
    await saveStorage();
  }
}

/**
 * Get the current storage data
 */
export function getStorage(): StorageSchema {
  if (!storageData) {
    throw new Error('Storage not initialized. Call initStorage() first.');
  }
  return storageData;
}

/**
 * Save the current storage data to disk
 */
export async function saveStorage(): Promise<void> {
  if (!storageData || !storagePath) {
    throw new Error('Storage not initialized');
  }

  // Atomic write: write to temp file, then rename
  const tempPath = `${storagePath}.tmp`;
  const content = JSON.stringify(storageData, null, 2);

  await fs.writeFile(tempPath, content, 'utf-8');
  await fs.rename(tempPath, storagePath);
}

/**
 * Create default storage schema
 */
function createDefaultStorage(): StorageSchema {
  return {
    version: CURRENT_VERSION,
    groups: [
      {
        id: 'grp_default',
        name: 'Repositories',
        repoIds: [],
      },
    ],
    repos: [],
    ui: {
      selectedRepoId: null,
      selectedView: 'workingCopy',
      sidebarWidth: 280,
      rightPaneWidth: 400,
    },
  };
}

// ============================================
// Group Operations
// ============================================

export function getGroups(): Group[] {
  return getStorage().groups;
}

export function getGroupById(groupId: string): Group | undefined {
  return getStorage().groups.find((g) => g.id === groupId);
}

export async function addGroup(group: Group): Promise<void> {
  getStorage().groups.push(group);
  await saveStorage();
}

export async function updateGroup(groupId: string, updates: Partial<Group>): Promise<void> {
  const storage = getStorage();
  const index = storage.groups.findIndex((g) => g.id === groupId);
  if (index === -1) {
    throw new Error(`Group not found: ${groupId}`);
  }
  storage.groups[index] = { ...storage.groups[index], ...updates };
  await saveStorage();
}

export async function deleteGroup(groupId: string): Promise<void> {
  const storage = getStorage();

  // Don't delete if it's the only group
  if (storage.groups.length <= 1) {
    throw new Error('Cannot delete the last group');
  }

  const groupIndex = storage.groups.findIndex((g) => g.id === groupId);
  if (groupIndex === -1) {
    throw new Error(`Group not found: ${groupId}`);
  }

  const group = storage.groups[groupIndex];

  // Move repos to default group (first group)
  const defaultGroup = storage.groups[0];
  if (defaultGroup.id !== groupId) {
    defaultGroup.repoIds.push(...group.repoIds);
  } else if (storage.groups.length > 1) {
    // If deleting default group, move to second group
    storage.groups[1].repoIds.push(...group.repoIds);
  }

  storage.groups.splice(groupIndex, 1);
  await saveStorage();
}

// ============================================
// Repo Operations
// ============================================

export function getRepos(): Repo[] {
  return getStorage().repos;
}

export function getRepoById(repoId: string): Repo | undefined {
  return getStorage().repos.find((r) => r.id === repoId);
}

export function getRepoByPath(repoPath: string): Repo | undefined {
  return getStorage().repos.find((r) => r.path === repoPath);
}

export async function addRepo(repo: Repo, groupId?: string): Promise<void> {
  const storage = getStorage();

  // Add to repos array
  storage.repos.push(repo);

  // Add to group
  const targetGroupId = groupId || storage.groups[0]?.id;
  const group = storage.groups.find((g) => g.id === targetGroupId);
  if (group) {
    group.repoIds.push(repo.id);
  }

  await saveStorage();
}

export async function removeRepo(repoId: string): Promise<void> {
  const storage = getStorage();

  // Remove from repos array
  const repoIndex = storage.repos.findIndex((r) => r.id === repoId);
  if (repoIndex !== -1) {
    storage.repos.splice(repoIndex, 1);
  }

  // Remove from all groups
  for (const group of storage.groups) {
    const index = group.repoIds.indexOf(repoId);
    if (index !== -1) {
      group.repoIds.splice(index, 1);
    }
  }

  // Clear selection if this repo was selected
  if (storage.ui.selectedRepoId === repoId) {
    storage.ui.selectedRepoId = null;
  }

  await saveStorage();
}

export async function moveRepo(
  repoId: string,
  toGroupId: string,
  index: number
): Promise<void> {
  const storage = getStorage();

  // Remove from current group
  for (const group of storage.groups) {
    const repoIndex = group.repoIds.indexOf(repoId);
    if (repoIndex !== -1) {
      group.repoIds.splice(repoIndex, 1);
      break;
    }
  }

  // Add to target group at index
  const targetGroup = storage.groups.find((g) => g.id === toGroupId);
  if (!targetGroup) {
    throw new Error(`Target group not found: ${toGroupId}`);
  }

  const clampedIndex = Math.max(0, Math.min(index, targetGroup.repoIds.length));
  targetGroup.repoIds.splice(clampedIndex, 0, repoId);

  await saveStorage();
}

export async function reorderRepo(
  groupId: string,
  fromIndex: number,
  toIndex: number
): Promise<void> {
  const storage = getStorage();
  const group = storage.groups.find((g) => g.id === groupId);

  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  if (fromIndex < 0 || fromIndex >= group.repoIds.length) {
    throw new Error(`Invalid fromIndex: ${fromIndex}`);
  }

  // Remove from old position
  const [repoId] = group.repoIds.splice(fromIndex, 1);

  // Insert at new position
  const clampedToIndex = Math.max(0, Math.min(toIndex, group.repoIds.length));
  group.repoIds.splice(clampedToIndex, 0, repoId);

  await saveStorage();
}

// ============================================
// UI State Operations
// ============================================

export function getUIState(): UIState {
  return getStorage().ui;
}

export async function updateUIState(updates: Partial<UIState>): Promise<void> {
  const storage = getStorage();
  storage.ui = { ...storage.ui, ...updates };
  await saveStorage();
}
