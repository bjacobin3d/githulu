import type { BranchInfo } from '~/types/githulu';

export type BranchTreeNode =
  | {
      type: 'folder';
      name: string;
      fullPath: string;
      children: BranchTreeNode[];
    }
  | {
      type: 'branch';
      name: string;
      branch: BranchInfo;
    };

/**
 * Builds a nested tree structure from a flat list of branches
 */
export function buildBranchTree(branches: BranchInfo[], defaultBranch?: string | null): BranchTreeNode[] {
  const root: Extract<BranchTreeNode, { type: 'folder' }> = {
    type: 'folder',
    name: '',
    fullPath: '',
    children: [],
  };

  for (const branch of branches) {
    const parts = branch.name.split('/');
    let currentFolder = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLastPart) {
        // This is the actual branch - add it to current folder
        currentFolder.children.push({
          type: 'branch',
          name: part,
          branch,
        });
      } else {
        // This is a folder - find or create it
        let folder = currentFolder.children.find(
          (child): child is Extract<BranchTreeNode, { type: 'folder' }> =>
            child.type === 'folder' && child.name === part
        );

        if (!folder) {
          folder = {
            type: 'folder',
            name: part,
            fullPath: currentPath,
            children: [],
          };
          currentFolder.children.push(folder);
        }

        // Move into this folder for the next iteration
        currentFolder = folder;
      }
    }
  }

  // Sort all children recursively, pinning the default branch first
  sortTreeRecursive(root, defaultBranch ?? null);

  // Return root's children (not the root itself)
  return root.children;
}

/**
 * Recursively sorts all children in the tree.
 * The default branch (if provided) is pinned to the top at every level.
 */
function sortTreeRecursive(
  node: Extract<BranchTreeNode, { type: 'folder' }>,
  defaultBranch: string | null
): void {
  node.children.sort((a, b) => sortNodes(a, b, defaultBranch));
  for (const child of node.children) {
    if (child.type === 'folder') {
      sortTreeRecursive(child, defaultBranch);
    }
  }
}

/**
 * Sort function for tree nodes:
 * 1. Default branch first (if it matches a branch node's full name)
 * 2. Folders before branches
 * 3. Alphabetically by name
 */
function sortNodes(a: BranchTreeNode, b: BranchTreeNode, defaultBranch: string | null): number {
  // Pin the default branch to the top
  if (defaultBranch) {
    const aIsDefault = a.type === 'branch' && a.branch.name === defaultBranch;
    const bIsDefault = b.type === 'branch' && b.branch.name === defaultBranch;
    if (aIsDefault && !bIsDefault) return -1;
    if (!aIsDefault && bIsDefault) return 1;
  }

  // Folders before branches
  if (a.type !== b.type) {
    return a.type === 'folder' ? -1 : 1;
  }

  // Alphabetically by name
  return a.name.localeCompare(b.name);
}

/**
 * Composable for managing branch tree state and folder collapse states
 */
export function useBranchTree(repoId: string) {
  const STORAGE_KEY_PREFIX = 'branch-folder-state';

  /**
   * Gets the localStorage key for a folder
   */
  function getFolderStateKey(folderPath: string): string {
    return `${STORAGE_KEY_PREFIX}:${repoId}:${folderPath}`;
  }

  /**
   * Checks if a folder is collapsed (default: false/expanded)
   */
  function isFolderCollapsed(folderPath: string): boolean {
    if (process.client) {
      const stored = localStorage.getItem(getFolderStateKey(folderPath));
      return stored === 'true';
    }
    return false;
  }

  /**
   * Sets the collapsed state of a folder
   */
  function setFolderCollapsed(folderPath: string, collapsed: boolean): void {
    if (process.client) {
      localStorage.setItem(getFolderStateKey(folderPath), String(collapsed));
    }
  }

  /**
   * Toggles the collapsed state of a folder
   */
  function toggleFolder(folderPath: string): boolean {
    const currentState = isFolderCollapsed(folderPath);
    const newState = !currentState;
    setFolderCollapsed(folderPath, newState);
    return newState;
  }

  /**
   * Transforms a flat list of branches into a tree structure
   */
  function transformBranches(branches: BranchInfo[], defaultBranch?: string | null): BranchTreeNode[] {
    return buildBranchTree(branches, defaultBranch);
  }

  return {
    transformBranches,
    isFolderCollapsed,
    setFolderCollapsed,
    toggleFolder,
  };
}
